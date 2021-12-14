                  require('chromedriver');                 //----- console.log(require('chromedriver').path);   
const webdriver = require('selenium-webdriver');
const chrome    = require('selenium-webdriver/chrome');   //------ for headless mode


module.exports.operatingMode = function (mode) {
    switch (mode) {
        case 1:
            return new webdriver.Builder().forBrowser('chrome').build();
        case 2:
            return new webdriver.Builder().withCapabilities(webdriver.Capabilities.chrome()).build();
        case 3:
            return new webdriver.Builder().withCapabilities(webdriver.Capabilities.chrome()).setChromeOptions(new chrome.Options().headless()).build();
        default:
            let err  = new Error('Wrong operating mode set! Check "operatingMode" variable value in "settings.js"');
            err.name = 'ModeError';

            console.error(err);        
        }
    }