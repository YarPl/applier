const newLineChar = process.platform === 'win32' ? '\r\n' : '\n';

const { Builder, By, Key, until } = require('selenium-webdriver');
const fs                          = require('fs');
const Emitter                     = require("events");
const tesseract                   = require('tesseract.js');
const uuid                        = require('uuid');

const options                     = require('./settings.js');
const selenium_configurator       = require('./selenium-configurator.js');
const restarter                   = require('./restarter.js');
const TestEmptyQue                = require('./queue-handler.js').TestEmptyQue;
const csv_handler                 = require('./csv-handler.js');
const csv_headers                 = require('./csv-headers.json');


let driver, restart_monitor, waitingFile, processingFile, invalid_data_file, inter_process_file, processed_data, worker, base64PngImage, folderName, recognizedText, skipSign, captcha, 
    refreshCounter = 0,
    cache          = new Map(),
    emitter        = new Emitter(),
    traineddata    = options.tesseract_lang;

    

async function recognize (img, traineddata) {

   await worker.load();
   await worker.loadLanguage(traineddata);
   await worker.initialize(traineddata);
   
   const { data: { text } } = await worker.recognize(img);
   console.log(`${newLineChar}Recognized text: ${text}`);
   
   return text;

};
   


function executor_recovery (error, func_name) {

   console.log(`${newLineChar}${error.name} occured while executing '${func_name}' function! Error's message: ${error.message}`);

   fs.appendFile("executor_recovery.txt", `--- ${error.name} occured while executing '${func_name}' function! Error's message: ${error.message}${newLineChar}`, function(error) {
      if(error) throw error; 
      
      console.log("Запись 'executor_recovery.txt' файла завершена.");
   });

   driver.quit();
   worker.terminate();


   if (!restart_monitor.decision) {

      emitter.emit("Delete", `${__dirname}/${traineddata}.traineddata`);
      
      fs.rename(options.directory_tree.enrichment_path + cache.get("new_fileName"), options.directory_tree.enrichment_path + cache.get("old_fileName"), function (err) { 
         if (err) throw err;
         console.log(`${newLineChar}${cache.get("new_fileName")} was renamed ${cache.get("old_fileName")}`);
      });
   
   }

   traineddata = options.tesseract_lang;

   if ((error.name !== 'NoSuchSessionError') && (!/ECONNREFUSED connect ECONNREFUSED/.test(error.message))) restart_monitor.do(executor, options.chronos.restart_delay)

};



emitter.on("done", async function (path_to_csv_file, csv_headers, array_of_objects, file_to_delete) {

   await csv_handler.csv_writer(path_to_csv_file, csv_headers, array_of_objects).then(() => {
      emitter.emit("Delete", file_to_delete);
   })

});



emitter.on("Delete", function (path_to_file) {
   
   fs.unlink(path_to_file, (err) => {
      if (err) {
         if (err.code === 'ENOENT') {
            console.log (`${newLineChar}'${path_to_file}' has already been removed!`);
         }
      }
      else console.log(`${newLineChar}'${path_to_file}' was deleted!`);
   });

});



emitter.on("Searchwork", async function searchwork () {

   try {

      console.time(`${newLineChar}Время на поиск информации по приставу`);

      await driver.wait(until.elementLocated(By.xpath("//label[contains(.,\'Поиск по номеру ИП\')]")), options.chronos.time_out, `radio button whose label matches the string "Поиск по номеру ИП" was not located!`)
      .then(async (el) => {

         await driver.executeScript("arguments[0].scrollIntoView()", el);
         await driver.sleep(options.chronos.think_time);
         
         await driver.wait(until.elementIsVisible(driver.findElement({ xpath: '//label[contains(.,\'Поиск по номеру ИП\')]'})), options.chronos.time_out, `radio button whose label matches the string "Поиск по номеру ИП" was not located!`)
         .then(async (el) => {
            await el.click();
         });
         
      });
      
      console.log(`${newLineChar}------------------------------------------------------------------------------------------`);
      console.log(`${newLineChar}Количество оставшихся номеров ИП: ${processed_data.length}${newLineChar}`);

      await driver.wait(until.elementLocated(By.id("input04")), options.chronos.time_out, `input field that points to the id name "input04" was not located!`)
      .then(async function(el) {

         await driver.executeScript("arguments[0].scrollIntoView()", el);
         await driver.wait(until.elementIsVisible(driver.findElement(By.id("input04"))), options.chronos.time_out, `input field that points to the id name "input04" was not visible!`).clear();
         
         return el;
      }).then(el => {
         el.sendKeys(processed_data[processed_data.length - 1].DeloNum);
      });

      await driver.sleep(options.chronos.think_time);


      await driver.wait(until.elementLocated(By.id("btn-sbm")), options.chronos.time_out, `submit button that points to the id name "btn-sbm" and whose visible text matches the string "Найти" was not located!`)
      .then(el => {
         el.click();
      });

      await driver.sleep(options.chronos.conditional_expectation);
         
         
      if (await driver.findElements(By.id("captcha-popup-code")).then(found => { return !!found.length })) {

         captcha        = await driver.findElement(By.id("capchaVisual")).getAttribute("src");
         recognizedText = await recognize(captcha, traineddata);

         emitter.emit("Guess and check", await driver.findElement(By.id("captcha-popup-code")), await driver.findElement(By.id("ncapcha-submit")));
      
      } else {
         refreshCounter = 0;
         emitter.emit("Parsing");
      }    

   } catch (error) {
      executor_recovery (error, searchwork.name)
   }

});




emitter.on("Guess and check", async function guess_and_check (captcha_input, submit_button) {
   
   try {
      
      skipSign = true;
      
      let normalizedText = recognizedText.replace(/\s+/g, "").toLowerCase();
      
      await captcha_input.sendKeys(normalizedText);
      await driver.sleep(options.chronos.think_time);
         
      base64PngImage = await driver.takeScreenshot();
      folderName     = uuid.v4();
         
      await submit_button.click();
      await driver.sleep(options.chronos.conditional_expectation);
         
         
      if (await driver.findElements(By.className("b-form__label b-form__label--error")).then(found => { return !!found.length })) {
         

         if (skipSign) {

            console.log(`${newLineChar}Captcha was not recognized!`);

            folderName = "wrong - " + folderName;
            
            fs.mkdirSync(options.directory_tree.captcha_path + folderName);
            console.log(`${newLineChar}'${folderName}' folder was created!`);
            
            fs.writeFileSync(`${options.directory_tree.captcha_path}${folderName}/screenshot.png`, base64PngImage, 'base64');
            fs.writeFileSync(`${options.directory_tree.captcha_path}${folderName}/captcha.jpg`, captcha.replace(/^data:image\/jpeg;base64,/, ""), 'base64');
            
            fs.writeFileSync(`${options.directory_tree.captcha_path}${folderName}/recognizedText.txt`, `'${recognizedText}'`);
            console.log(`${newLineChar}Captcha image and recognized text were saved to '${folderName}' folder!${newLineChar}`);

            skipSign = false;
         
         }
         
         captcha        = await driver.findElement(By.id("capchaVisual")).getAttribute("src");
         recognizedText = await recognize(captcha, traineddata);
            
            
         emitter.emit("Guess and check", await driver.findElement(By.id("captcha-popup-code")), await driver.findElement(By.id("ncapcha-submit")));
         
      } else {

         refreshCounter = 0;
         emitter.emit("Parsing");

      }
   
   } catch (error) {
      executor_recovery (error, guess_and_check.name)
   }

});



emitter.on("Parsing", async function parsing() {
   
   try {

      // -- main

      await driver.wait(until.elementLocated(By.className("list border table alt-p05")), options.chronos.conditional_expectation, `table describing the enforcement proceeding which can be located by class 'list border table alt-p05' was not located!`)
      .then(async (el) => {

         if (skipSign) {

            console.log(`${newLineChar}Captcha was successfully recognized!`);

            folderName = "right - " + folderName;
            
            fs.mkdirSync(options.directory_tree.captcha_path + folderName);
            console.log(`${newLineChar}'${folderName}' folder was created!`);
            
            fs.writeFileSync(`${options.directory_tree.captcha_path}${folderName}/captcha.png`, base64PngImage, 'base64');
            fs.writeFileSync(`${options.directory_tree.captcha_path}${folderName}/captcha.jpg`, captcha.replace(/^data:image\/jpeg;base64,/, ""), 'base64');
            
            fs.writeFileSync(`${options.directory_tree.captcha_path}${folderName}/recognizedText.txt`, `'${recognizedText}'`);
            console.log(`${newLineChar}Captcha image and recognized text were saved to '${folderName}' folder!${newLineChar}`);

            skipSign = false;
         
         }


         await driver.executeScript("arguments[0].scrollIntoView()", el);
         
         processed_data[processed_data.length - 1].ComplainedMarshal = await driver.findElement(By.xpath("//td[8]")).getText();
         processed_data[processed_data.length - 1].Suspended         = await driver.findElement(By.xpath("//td[4]")).getText();
         
         fs.appendFileSync(options.directory_tree.enrichment_path + inter_process_file, `${newLineChar}` + JSON.stringify(processed_data[processed_data.length - 1]) + ',');
         
         let delEl = processed_data.pop();
         
         console.log(`${newLineChar}Исполнительное производство(номер): ${newLineChar}${delEl.DeloNum}`);
         console.log(`${newLineChar}Судебный пристав-исполнитель, телефон для получения информации: ${newLineChar}${delEl.ComplainedMarshal}`);
         console.log(`${newLineChar}Дата, причина окончания или прекращения ИП (статья, часть, пункт основания): ${newLineChar}${delEl.Suspended}`);
         
         await csv_handler.csv_writer(options.directory_tree.enrichment_path + cache.get("new_fileName"), csv_headers.manhunter_recovery, processed_data);


         console.timeEnd(`${newLineChar}Время на поиск информации по приставу`);
         

         if (processed_data.length === 0) {
            
            console.log(`${newLineChar}'${cache.get("new_fileName")}' file is empty! Nothing to process...`);
            emitter.emit("Terminate");
   
         } else {
   
            emitter.emit("Searchwork");
            
         }

      })
      .catch(async (err) => {

         if (err.name !== 'TimeoutError') throw err;



         // -- 1
         await driver.wait(until.elementLocated(By.xpath("//h4[contains(.,\'По вашему запросу ничего не найдено\')]")), options.chronos.think_time, `element which can be located by xpath '//h4[contains(.,\'По вашему запросу ничего не найдено\')]' was not located!`)
         .then(async (el) => {

            if (skipSign) {

               console.log(`${newLineChar}Captcha was successfully recognized!`);
   
               folderName = "right - " + folderName;
               
               fs.mkdirSync(options.directory_tree.captcha_path + folderName);
               console.log(`${newLineChar}'${folderName}' folder was created!`);
               
               fs.writeFileSync(`${options.directory_tree.captcha_path}${folderName}/captcha.png`, base64PngImage, 'base64');
               fs.writeFileSync(`${options.directory_tree.captcha_path}${folderName}/captcha.jpg`, captcha.replace(/^data:image\/jpeg;base64,/, ""), 'base64');
               
               fs.writeFileSync(`${options.directory_tree.captcha_path}${folderName}/recognizedText.txt`, `'${recognizedText}'`);
               console.log(`${newLineChar}Captcha image and recognized text were saved to '${folderName}' folder!${newLineChar}`);
   
               skipSign = false;
            
            }
   
   
            let err  = new Error(await el.getText());
            err.name = "FSSP_Error";
            
            if ((err.name === "FSSP_Error") && (err.message === "По вашему запросу ничего не найдено")) {
               
               processed_data[processed_data.length - 1].skipReason = err.message;
               fs.appendFileSync(options.directory_tree.enrichment_path + invalid_data_file, `${newLineChar}` + JSON.stringify(processed_data[processed_data.length - 1]) + ',');
               
               let delEl = processed_data.pop();
               console.log(`${newLineChar}${delEl.DeloNum} : ${err.message}`);
               
               await csv_handler.csv_writer(options.directory_tree.enrichment_path + cache.get("new_fileName"), csv_headers.manhunter_recovery, processed_data);
   
   
               console.timeEnd(`${newLineChar}Время на поиск информации по приставу`);
               
   
               if (processed_data.length === 0) {
                  
                  console.log(`${newLineChar}'${cache.get("new_fileName")}' file is empty! Nothing to process...`);
                  emitter.emit("Terminate");
         
               } else {
                  emitter.emit("Searchwork");
               }
   
   
            } else {
               console.log(`${newLineChar}${err.name} : ${err.message}`);
               throw err;
            }

         })
         .catch(async (err) => {

            if (err.name !== 'TimeoutError') throw err;

            console.log(`${newLineChar}listener 1 timed out`);

            if (refreshCounter === 2) {
               await driver.navigate().refresh();
               refreshCounter = 0;
               emitter.emit("Searchwork");
            }
            else refreshCounter += 1;

         });



         // -- 2
         await driver.wait(until.elementLocated(By.xpath("//h4[contains(.,\'Не удалось осуществить поиск: система перегружена\')]")), options.chronos.think_time, `element which can be located by xpath '//h4[contains(.,\'Не удалось осуществить поиск: система перегружена\')]' was not located!`)
         .then(async (el) => {

            let err  = new Error(await el.getText());
            err.name = "FSSP_Error";
            
            if ((err.name === "FSSP_Error") && (err.message === "Не удалось осуществить поиск: система перегружена")) {

               console.log(`${newLineChar}${err.name} : ${err.message}`);
                
               emitter.emit("Searchwork");

            } else {
               console.log(`${newLineChar}${err.name} : ${err.message}`);
               throw err;
            }
   

         })
         .catch(async (err) => {

            if (err.name !== 'TimeoutError') throw err;

            console.log(`${newLineChar}listener 2 timed out`);

            if (refreshCounter === 2) {
               await driver.navigate().refresh();
               refreshCounter = 0;
               emitter.emit("Searchwork");
            }
            else refreshCounter += 1;

         });



         // -- 3
         await driver.wait(until.elementLocated(By.xpath("//div[contains(.,\'Ваш запрос уже обрабатывается\')]")), options.chronos.think_time, `element which can be located by xpath '//div[contains(.,\'Ваш запрос уже обрабатывается\')]' was not located!`)
         .then(async (el) => {
            
            let err  = new Error(await el.getText());
            err.name = "FSSP_Error";
           
            console.log(`${newLineChar}${err.name} : ${err.message}`);
            
            emitter.emit("Searchwork");
         
         })
         .catch(async (err) => {
            
            if (err.name !== 'TimeoutError') throw err;

            console.log(`${newLineChar}listener 3 timed out`);
            
            if (refreshCounter === 2) {
               await driver.navigate().refresh();
               refreshCounter = 0;
               
               emitter.emit("Searchwork");
            }
            else refreshCounter += 1;
         });
      });
   
   } catch (error) {
      executor_recovery (error, parsing.name)
   }

});



emitter.on("Terminate", async function terminate() {
   
   try {
      
      emitter.emit("Delete", `${__dirname}/${traineddata}.traineddata`);
      emitter.emit("Delete", `${options.directory_tree.enrichment_path}${processingFile}`);
      
      if (fs.existsSync(options.directory_tree.enrichment_path + inter_process_file)) {
         
         emitter.emit(await csv_handler.json_layer_for_csv(options.directory_tree.enrichment_path + inter_process_file), options.directory_tree.raw_data_path + uuid.v4() + ".csv", 
         csv_headers.manhunter_ready, JSON.parse(fs.readFileSync(options.directory_tree.enrichment_path + inter_process_file, "utf8")), options.directory_tree.enrichment_path + inter_process_file)
      
      } else {
         console.log(`${newLineChar}${inter_process_file} does not exist!`);
      }
      
      if (fs.existsSync(options.directory_tree.enrichment_path + invalid_data_file)) {
         
         emitter.emit(await csv_handler.json_layer_for_csv(options.directory_tree.enrichment_path + invalid_data_file), options.directory_tree.vault_path + uuid.v4() + ".csv",
         csv_headers.manhunter_failed, JSON.parse(fs.readFileSync(options.directory_tree.enrichment_path + invalid_data_file, "utf8")), options.directory_tree.enrichment_path + invalid_data_file)
      
      } else {
         console.log(`${newLineChar}${invalid_data_file} does not exist!`);
      }
      
      cache.clear();
      worker.terminate();
      driver.quit();

      console.timeEnd(`${newLineChar}Поиск завершен за`);
   
   } catch(error){
      executor_recovery (error, terminate.name)
   }

})



let executor = async function () {

   try {
      
      console.time(`${newLineChar}Поиск завершен за`);

      driver = selenium_configurator.operatingMode(options.operatingMode);
      await driver.manage().window().maximize();


      if (TestEmptyQue(options.directory_tree.enrichment_path) || cache.has("old_fileName")) {


         if (cache.has("old_fileName")) {
             
            console.log(`${newLineChar}Script was restarted! ${cache.get("new_fileName")} is at the stage of processing!`);
             
            waitingFile    = cache.get("old_fileName");
            processingFile = cache.get("new_fileName");
         
         } else {
             
            waitingFile    = TestEmptyQue(options.directory_tree.enrichment_path);
            processingFile = waitingFile.match(/\d+/)[0] + "_processing.csv";

            cache.set("old_fileName", waitingFile);
            cache.set("new_fileName", processingFile);

            fs.renameSync(options.directory_tree.enrichment_path + waitingFile, options.directory_tree.enrichment_path + processingFile);
             
            console.log(`${newLineChar}${waitingFile} was renamed ${processingFile}`);
         
         }


         processed_data     = await csv_handler.csv_parser(options.directory_tree.enrichment_path + cache.get("new_fileName"));

         invalid_data_file  = processingFile.match(/\d+/)[0] + "_invalid-data.json";
         inter_process_file = processingFile.match(/\d+/)[0] + "_inter-process.json";



         if (fs.existsSync(`${__dirname}/${processingFile.match(/\d+/)[0]}_${traineddata}.traineddata`)) {

            traineddata = `${processingFile.match(/\d+/)[0]}_${traineddata}`;
            
            worker = tesseract.createWorker({
               langPath: '..',
               gzip: false,
               logger: data => console.log(data)
            });

         } else if (fs.existsSync(`${__dirname}/${traineddata}.traineddata`)) {
            
            fs.copyFileSync(`${__dirname}/${traineddata}.traineddata`, `${__dirname}/${processingFile.match(/\d+/)[0]}_${traineddata}.traineddata`);

            traineddata = `${processingFile.match(/\d+/)[0]}_${traineddata}`;

            worker = tesseract.createWorker({
               langPath: '..',
               gzip: false,
               logger: data => console.log(data)
            });

         } else {

            worker = tesseract.createWorker({
               logger: data => console.log(data)
            });

         }

         
         restart_monitor = new restarter(processed_data[processed_data.length - 1], options.chronos.restart_attempts);


         await driver.get('https://fssp.gov.ru/iss/ip');


         await driver.wait(until.elementLocated(By.xpath("//label[contains(.,\'Поиск по номеру ИП\')]")), options.chronos.time_out, `radio button whose label matches the string "Поиск по номеру ИП" was not located!`)
         .then(async () => {
            emitter.emit("Searchwork")
         });
      
      
      } else {
         driver.quit()
      }

   } catch (error) {
      executor_recovery (error, executor.name)
   }

};

executor();