module.exports = {
  apps : [{
    name   : "sieve",
    script : "../sieve.js",
    autorestart: false,
    watch: ["../input/storage", "../input/raw_data"],
    watch_delay: 600000
  },
  {
    name   : "applier",
    script : "../applier.js",
    autorestart: false,
    instances: 5
  }]
}