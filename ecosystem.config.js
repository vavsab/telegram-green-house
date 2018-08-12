module.exports = {
    apps : [
      {
        name: 'green-house',
        script: 'app.js',
        log_file: "logs/green-house.log",
        merge_logs: true,
        log_date_format: "YYYY-MM-DD HH:mm"
      }
    ]
  };