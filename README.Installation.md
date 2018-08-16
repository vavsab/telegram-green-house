# Установка telegram-green-house

## Схема подключения


## Установка бота на Raspberry

**Требования**:
* Базовые навыки работы с коммандной строкой в Linux-системах.
* Наличие персонального компьютера или ноутбука (далее по тексту ПК) с ридером для SD-карт.
* Наличие WiFi-роутера, к которому есть доступ в панель управления.
* Доступ к интернету.

1. Скачиваем на свой ПК образ операционной системы для Raspberry [RASPBIAN STRETCH LITE](https://www.raspberrypi.org/downloads/raspbian/). Не полную, а именно LITE версию. На момент написания инструкций версия системы была `June 2018`.
2. Записываем образ на micro sd флешку. Это можно сделать при помощи утилиты [Etcher](https://etcher.io/)
3. Нужно беспечить себе доступ к Raspberry. Если есть в наличии USB-клавиатура и HDMI-монитор, то вставляем все вместе с флешкой в Raspberry, подаем на нее питание и работаем, как на обычном компьютере (по умолчанию юзер `pi`, пароль `raspberry`). В моем же случае была только Raspberry и домашний WiFi-роутер. С этом случае нужно:
    1. Отредактировать на флешке файл `/etc/wpa_supplicant/wpa_supplicant.conf`, чтобы Rasbperry автоматически при старте подключилась к WiFi. Если у Вас ПК на Windows, то просто так не получится отредактировать флешку (только boot раздел), потому что там другая фаловая система и Windows ее не видит. Исправить это поможет утилита [Ext2FSD](http://www.ext2fsd.com/?page_id=16). После установки Windows увидит флешку. Открываем `/etc/wpa_supplicant/wpa_supplicant.conf` и пишем туда и сохраняем:<br />
        ```
        ctrl_interface=/run/wpa_supplicant
        update_config=1
        network={
    	    ssid="МояДомашняяСеть"
	        psk="СуперПарольОтСети"
        }
        ```
    2. Нужно настроить ssh для удаленного доступа к Raspberry. Есть в Raspbian простой способ. В boot разделе (который намного меньше по размеру и виден для Windows сразу, без установки Ext2FSD) создаем пустой файл `ssh` без расширений типа  ~~`ssh.txt`~~. Если Raspbian при загрузке видит этот файл, то активирует ssh. [Источник](https://www.raspberrypi.org/forums/viewtopic.php?t=169905)
    3. Вставляем флешку в Raspberry и запускаем ее.
    4. Теперь на ПК нужно установить клиент для ssh. Например, [MobaXterm](https://mobaxterm.mobatek.net/download.html). Бесплатной версии вполне хватит.
    5. Если все прошло успешно, то в панели администрирования в WiFi-роутере должна появиться `raspberrypi`. Нужно узнать, какой у нее IP-адрес. Обычно в роутерах эта информация находится во вкладке DHCP.
    6. Создаем SSH-сессию в MobaXterm. Если все правильно сконфигурировано, то консоль предложит ввести логин/пароль. По умолчанию юзер `pi`, пароль `raspberry`.
4. После входа **обязательно** меняем стандартный пароль командой `sudo passwd pi`. Иначе Вас легко взломают. Если сложно придумать хороший пароль, то его всегда можно [сгенерировать](https://passwordsgenerator.net/ru/)
5. Устанавливаем NodeJS (среда для выполнения кода JavaScript). Устанавливаем именно **8.х**, не 10.х. Новая версия NodeJS пока что несовместима с библиотеками для работы с I2C (датчик влажности/температуры).
    ```
    curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
    sudo apt-get install -y nodejs
    ```
6. Устанавливаем PM2 (менеджер процессов)
    ```
    sudo npm i pm2 -g
    ```
7. Устанавливаем BCM2835 (библиотека для работы с пинами GPIO)
   ```
   wget http://www.airspayce.com/mikem/bcm2835/bcm2835-1.50.tar.gz;
   tar xvfz bcm2835-1.50.tar.gz;
   cd bcm2835-1.50;
   ./configure;
   make;
   sudo make install
   ```
   [Источник](https://gist.github.com/annem/3183536)
8. Активируем интерфейс I2C (для коммуникации с датчиком температуры/влажности)<br />
   `sudo raspi-config`<br />
   В меню переходим: `Interfacing options => Advanced options => I2C => Yes => Yes => Finish`<br />
   [Источник](https://learn.adafruit.com/adafruits-raspberry-pi-lesson-4-gpio-setup/configuring-i2c)
9. Устанавливаем PhantomJS (библиотека для рендеринга веб-страниц. Нужна для графиков температуры и прогноза погоды)
    ```
    wget https://github.com/fg2it/phantomjs-on-raspberry/releases/download/v2.1.1-wheezy-jessie-armv6/phantomjs_2.1.1_armhf.deb
    dpkg -i phantomjs_2.1.1_armhf.deb
    apt --fix-broken install
    dpkg -i phantomjs_2.1.1_armhf.deb
    ```
   [Источник](https://github.com/fg2it/phantomjs-on-raspberry)
10. Устанавливаем MongoDB (база данных для сохранения показаний датчиков)
    ```
    sudo apt-get install mongodb
    ```
11. Раздел еще не закончен.
12. Перезагружаем Raspberry `sudo reboot`

## FAQ
### Что делать, если забыл пароль от Raspberry?
Раздел еще не закончен.
   