module.exports = {
  apps : [{
    name   : "sieve",
    script : "../sieve.js",
    restart_delay : 300000
  },
  {
    name   : "manhunter",
    script : "../manhunter.js",
    instances: 3,
    restart_delay: 300000
  },
  {
    name   : "applier",
    script : "../applier.js",
    restart_delay: 300000
  }]
}
