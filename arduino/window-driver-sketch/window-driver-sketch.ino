// Import library from https://github.com/rkoptev/ACS712-arduino
#include <ACS712.h>

enum State {
  StateStart,
  StateClosed,
  StateClosing,
  StateOpen,
  StateOpening,
  StateError
} state;

#define CommandReset   "reset"
#define CommandClose   "close"
#define CommandOpen    "open"
#define CommandState   "state"

#define UARTPin           8
#define RS485Transmit     HIGH
#define RS485Receive      LOW 
#define MessageDelimiter  "#"
#define MessageBufferSize 8     // 1 for address + 1 delimiter + 5 for command + "\0". Example "5#state"

#define LimitSwitchUpPin            2
#define LimitSwitchDownPin          3
#define LimitSwitchEnabled          LOW
#define LimitSwitchDisabled         HIGH
#define LimitSwitchReleaseTimeout   1000 // Time in ms that is needed to release opposite limit switch. Fof example, to release down switch when opening a window
#define LimitSwitchOpenCloseTimeout 4000 // Time in ms that is needed to open/close a window

#define RelayUpPin      7
#define RelayDownPin    6
#define RelayEnable     LOW
#define RelayDisable    HIGH

#define ErrorLEDPin       13
#define ErrorLEDEnable    HIGH
#define ErrorLEDDisable   LOW

#define MaxAllowedCurrent 5 // Amperes

byte limitSwitchUp = LimitSwitchDisabled;
byte limitSwitchDown = LimitSwitchDisabled;
byte relayUp = RelayDisable;
byte relayDown = RelayDisable;
byte errorLED = ErrorLEDDisable;

String lastError = "";
int lastErrorCode = 0;
String lastCommand = "";
char messageBuffer[MessageBufferSize];
int messageBufferIndex = 0;
int messageAddress = 5;
float current = 0;
ACS712 currentSensor(ACS712_30A, A0);
unsigned long lastStateChangeTime;

void setup() {
  pinMode(RelayDownPin, OUTPUT);
  pinMode(RelayUpPin, OUTPUT);
        
  pinMode(ErrorLEDPin, OUTPUT);
  pinMode(UARTPin, OUTPUT);
  
  pinMode(LimitSwitchUpPin, INPUT_PULLUP);
  pinMode(LimitSwitchDownPin, INPUT_PULLUP);

  setOutPins();
  lastStateChangeTime = millis();

  Serial.begin(9600);
  Serial.println("Started");
}

void loop() {
  limitSwitchUp = digitalRead(LimitSwitchUpPin);
  limitSwitchDown = digitalRead(LimitSwitchDownPin);
  current = currentSensor.getCurrentDC();

  updateLastCommand();
  responseToMessage();
  updateState();
  lastCommand = "";
  setOutPins();
}

void updateLastCommand() {
  while (Serial.available() > 0) {
      char incomingChar;
      incomingChar = char(Serial.read());      
      
      if (incomingChar == '\n') {
        messageBuffer[messageBufferIndex] = '\0';
        messageBufferIndex = 0;
        char* token = strtok(messageBuffer, MessageDelimiter);
        if (token == NULL)
          return;

        int address = atoi(token);
        if (address != messageAddress)
          return;
        
        token = strtok(NULL, MessageDelimiter);
        if (token == NULL)
          return;

        lastCommand = token;
        Serial.println("Parsed command: " + lastCommand);
      } else {
        messageBuffer[messageBufferIndex] = incomingChar;
        messageBufferIndex++;
      }

      if (messageBufferIndex >= MessageBufferSize) {
          messageBufferIndex = 0;
          Serial.println("Error while parsing command: " + String(messageBuffer));
      }
  }
}

void responseToMessage() {
  if (lastCommand != CommandState) 
    return;
  
  Serial.println(getCurrentState());
}

void updateState() {
  State oldState = state;
  unsigned long msOnCurrentState = millis() - lastStateChangeTime;

  if (current > MaxAllowedCurrent) {
    setError("Too high current on state " + getCurrentState(), 10);
  } else if (lastCommand == CommandReset) {
    state = StateStart;
  } else {
    switch (state) {
      case StateStart:
        errorLED = ErrorLEDDisable;
        relayUp = RelayDisable;
        relayDown = RelayDisable;
        
        if (limitSwitchUp == LimitSwitchEnabled && limitSwitchDown == LimitSwitchEnabled) {
          setError("Start failure. Up and down limits have been enabled.", 1);
        } else if (limitSwitchUp == LimitSwitchEnabled && limitSwitchDown == LimitSwitchDisabled) {
          state = StateOpen;
        } else if (limitSwitchUp == LimitSwitchDisabled && limitSwitchDown == LimitSwitchEnabled) {
          state = StateClosed;
        } else if (limitSwitchUp == LimitSwitchDisabled && limitSwitchDown == LimitSwitchDisabled) {
          state = StateClosing;
        }
        
        break;
        
      case StateClosed:
        errorLED = ErrorLEDDisable;
        relayUp = RelayDisable;
        relayDown = RelayDisable;
        
        if (limitSwitchUp == LimitSwitchEnabled) {
          setError("Closed failure. Up limit has been enabled.", 2);
        } else if (limitSwitchDown == LimitSwitchDisabled) {
          setError("Closed failure. Down limit has been disabled.", 3);
        } else if (lastCommand == CommandOpen) {
          state = StateOpening;
        }
        
        break;
        
      case StateClosing:
        errorLED = ErrorLEDDisable;
        relayUp = RelayDisable;
        relayDown = RelayEnable;

        if (limitSwitchUp == LimitSwitchEnabled && msOnCurrentState > LimitSwitchReleaseTimeout) {
          setError("Closing timeout. Up limit is still enabled", 4);
        } else if (limitSwitchDown == LimitSwitchDisabled && msOnCurrentState > LimitSwitchOpenCloseTimeout) {
          setError("Closing timeout. Down limit has not been enabled", 5);  
        } else if (limitSwitchDown == LimitSwitchEnabled) {
          state = StateClosed;
        } else if (lastCommand == CommandOpen) {
          state = StateOpening;
        }
        
        break;
        
      case StateOpen:
        errorLED = ErrorLEDDisable;
        relayUp = RelayDisable;
        relayDown = RelayDisable;
        
        if (limitSwitchDown == LimitSwitchEnabled) {
          setError("Open failure. Down limit has been enabled.", 6);
        } else if (limitSwitchUp == LimitSwitchDisabled) {
          setError("Open failure. Up limit has been disabled.", 7);
        } else if (lastCommand == CommandClose) {
          state = StateClosing;
        }
        
        break;
        
      case StateOpening:
        errorLED = ErrorLEDDisable;
        relayUp = RelayEnable;
        relayDown = RelayDisable;

        if (limitSwitchDown == LimitSwitchEnabled && msOnCurrentState > LimitSwitchReleaseTimeout) {
          setError("Opening timeout. Down limit is still enabled", 8);
        } else if (limitSwitchUp == LimitSwitchDisabled && msOnCurrentState > LimitSwitchOpenCloseTimeout) {
          setError("Opening timeout. Up limit has not been enabled", 9);  
        } else if (limitSwitchUp == LimitSwitchEnabled) {
          state = StateOpen;
        } else if (lastCommand == CommandClose) {
          state = StateClosing;
        }
        
        break;
        
      case StateError:
        errorLED = ErrorLEDEnable;
        relayUp = RelayDisable;
        relayDown = RelayDisable;

        break;
    }
  }

  if (oldState != state) {
    lastStateChangeTime = millis();
    Serial.println("State has been changed to " + getCurrentState());
  }
}

void setOutPins() {
  digitalWrite(RelayUpPin, relayUp);
  digitalWrite(RelayDownPin, relayDown);
  digitalWrite(ErrorLEDPin, errorLED);
}

void setError(String errorText, int code) {
  state = StateError;
  lastError = errorText; 
  lastErrorCode = code;
}

String getCurrentState() {
  switch (state) {
    case StateStart:
      return "start";
    case StateClosed:
      return "closed";
    case StateClosing:
      return "closing";
    case StateOpen:
      return "open";
    case StateOpening:
      return "opening";
    case StateError:
      return "error#" + String(lastErrorCode) + "#" + lastError;
    default:
      return "";
  }
}

