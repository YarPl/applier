const newLineChar = process.platform === 'win32' ? '\r\n' : '\n';

const { Builder, By, Key, until } = require('selenium-webdriver');
const fs                          = require('fs');
const Emitter                     = require("events");
const uuid                        = require('uuid');

const options                     = require('./settings.js');
const selenium_configurator       = require('./selenium-configurator.js');
const restarter                   = require('./restarter.js');
const user_configurator           = require('./user-configurator.js');
const TestEmptyQue                = require('./queue-handler.js').TestEmptyQue;
const csv_handler                 = require('./csv-handler.js');
const field_generator             = require('./field-generator.js');
const csv_headers                 = require('./csv-headers.json');


let driver, restart_monitor, waitingFile, processingFile, invalid_data_file, inter_process_file, field_values, processed_data, user, userIndex,
    cache     = new Map(),
    emitter   = new Emitter();




emitter.on("done", function (path_to_csv_file, csv_headers, array_of_objects, path_to_json_file, json_file_name, prefix_id) {
    
    csv_handler.csv_writer(path_to_csv_file, csv_headers, array_of_objects).then(() => {
        
        fs.rename(path_to_json_file + json_file_name, path_to_json_file + prefix_id + "_" + json_file_name, function(err) {
            if (err) console.error(`${newLineChar}${err.name} occured! Error's message: ${err.message}`);
        });

    })

});



fs.readFile("users.json", "utf8", function (error, users) {
    
    if (error) throw error;

    users     = JSON.parse(users);
    
    userIndex = users.findIndex(user => user.isFree === true);
    
    if (userIndex !== -1) {

        user = new user_configurator(users[userIndex]);
        users[userIndex]["isFree"] = false;
        fs.writeFileSync("users.json", JSON.stringify(users));

        console.log(`${newLineChar}'${user.claimant}' status was successfully updated!`);
    
    }

});



(async function executor() {
    
    try {

        console.time(`${newLineChar}Заявления поданы за`);
        
        driver = selenium_configurator.operatingMode(options.operatingMode);

        await driver.manage().window().maximize();

        
        if (userIndex === -1) console.log(`${newLineChar}All operators are currently unavailable!`);

        if ((TestEmptyQue(options.directory_tree.verified_data_path) || cache.has("old_fileName")) && userIndex !== -1) {
     

            if (cache.has("old_fileName")) {
                
                console.log(`${newLineChar}Script was restarted! ${cache.get("new_fileName")} is at the stage of processing!`);
                
                waitingFile    = cache.get("old_fileName");
                processingFile = cache.get("new_fileName");
            
            } else {
                
                waitingFile = TestEmptyQue(options.directory_tree.verified_data_path);
                processingFile = waitingFile.match(/\d+/)[0] + "_processing.csv";

                cache.set("old_fileName", waitingFile);
                cache.set("new_fileName", processingFile);

                fs.renameSync(options.directory_tree.verified_data_path + waitingFile, options.directory_tree.verified_data_path + processingFile);
                
                console.log(`${newLineChar}${waitingFile} was renamed ${processingFile}`);
            
            }


        processed_data     = await csv_handler.csv_parser(options.directory_tree.verified_data_path + cache.get("new_fileName"));
        
        invalid_data_file  = processingFile.match(/\d+/)[0] + "_invalid-data.json";
        inter_process_file = processingFile.match(/\d+/)[0] + "_inter-process.json";
        
        restart_monitor    = new restarter(processed_data[processed_data.length - 1], options.chronos.restart_attempts);



        {
            await driver.get('https://www.gosuslugi.ru/');

            await driver.wait(until.elementLocated(By.xpath("//h3[contains(.,\'Укажите ваше местоположение\')]")), options.chronos.conditional_expectation, `модальное окно "Укажите ваше местоположение" не найдено!`)
            .then(async () => {
                
                await driver.wait(until.elementLocated(By.css(".radio-label--manual > .icon")), options.chronos.time_out, `радиокнопка "Выбрать вручную" в модальном окне "Укажите ваше местоположение" не найдена!`)
                .then(el => {
                    el.click();
                });
    
                await driver.wait(until.elementLocated(By.id("epgu-search-input")), options.chronos.time_out, `текстовое поле "Название населенного пункта" в модальном окне "Укажите ваше местоположение" не найдено!`)
                .then(el => {
                    el.sendKeys(user.location)
                });
    
                await driver.wait(until.elementLocated(By.xpath(`//li[contains(.,\'${user.location}\')]`)), options.chronos.time_out, `искомый элемент раскрывающегося списка в модальном окне "Укажите ваше местоположение" не найден!`)
                .then(el => {
                    el.click()
                });
    
                await driver.wait(until.elementLocated(By.id("region-submit-btn")), options.chronos.time_out, `кнопка "Сохранить" в модальном окне "Укажите ваше местоположение" не найдена!`)
                .then(el => {
                    el.click()
                });

            }).catch(e => {
                  if (e.name !== 'TimeoutError') throw e
            });

            await driver.sleep(options.chronos.think_time);
        }


        {
            await driver.get('https://esia.gosuslugi.ru/');

            await driver.wait(until.elementLocated({ xpath: '//*[@id="login"]' }), options.chronos.time_out, `текстовое поле "Телефон, почта или СНИЛС" в форме авторизации не найдено!`)
            .then(el => {
               el.click();
               return el;
            }).then(el => {
               el.sendKeys(user.login);
            });
   
            await driver.wait(until.elementLocated({ xpath: '//*[@id="password"]' }), options.chronos.time_out, `текстовое поле "Пароль" в форме авторизации не найдено!`)
            .then(el => {
               el.click();
               return el;
            }).then(el => {
               el.sendKeys(user.password);
            });
   
            await driver.wait(until.elementLocated({ xpath: "//button[contains(.,\'Войти\')]" }), options.chronos.time_out, `кнопка "Войти" в форме авторизации не найдена!`)
            .then(el => {
               el.click();
            });

            await driver.wait(until.elementLocated(By.linkText("Мои данные")), options.chronos.time_out, `вкладка "Мои данные" не найдена!`);

            await driver.sleep(options.chronos.think_time);
        }


        {
            await driver.get('https://roles.gosuslugi.ru/');
            
            await driver.wait(until.elementLocated({ xpath: "//p[contains(.,\'Частное лицо\')]"}), options.chronos.conditional_expectation, `блок войти как "Частное лицо" не найден!`)
            .then(async (el) => {

                await el.click();

                await driver.wait(until.elementLocated(By.linkText("Услуги")), options.chronos.time_out, `гиперссылка "Услуги" не найдена!`);

            }).catch(e => {
                if (e.name !== 'TimeoutError') throw e
            });

            await driver.sleep(options.chronos.think_time);
        }


        {
            await driver.get('https://www.gosuslugi.ru/404402/1/form');


            for (let i = processed_data.length - 1; i >= 0; i--) {

                console.time(`${newLineChar}Заявление подано за`);

                console.log(`${newLineChar}------------------------------------------------------------------------------------------`);
                console.log(`${newLineChar}Количество оставшихся заявлений: ${i + 1}`);
                console.log(`${newLineChar}${JSON.stringify(user)}`);


                let retry_indicator = true;

                while (retry_indicator) {

                    await driver.wait(until.elementLocated(By.linkText("Начать заново")), options.chronos.time_out, `hyperlink element whose visible text matches the string "Начать заново" was not located!`)
                    .then(el => {
                        el.click();
                    })
                    .catch(e => {
                        if (e.name !== 'TimeoutError') throw e
                    });

                    
                    await driver.wait(until.elementLocated(By.xpath("//span[contains(.,\'Невозможно загрузить черновик.\')]")), options.chronos.conditional_expectation, `строчный элемент документа, содержащий текст "Невозможно загрузить черновик.", не найден!`)
                    .then(async (el) => {
                        console.log(`${newLineChar}${await el.getAttribute("innerText")} Страница будет перезагружена!`);
                        await driver.navigate().refresh();
                    })
                    .catch(e => {
                        if (e.name !== 'TimeoutError') throw e;
                        retry_indicator = false;
                    });

                }


                await driver.wait(until.elementLocated(By.xpath("//h4[contains(.,\'Данные об адресах\')]")), options.chronos.time_out, `заголовок четвертого уровня, содержащий текст "Данные об адресах", не найден!`)
                .then(async function (el) {
                    await driver.executeScript("arguments[0].scrollIntoView()", el);
                    await driver.executeScript(`document.querySelector("body").getElementsByClassName("PGU-dropdown-el")[1].click()`);
                });
                
                await driver.sleep(options.chronos.think_time);


                await driver.wait(until.elementLocated(By.xpath("//form-tree[3]/div/div/div[2]/form-tree/epgu-panel/div/div/div/div/div/form-tree/epgu-panel/div/div/div/div/div/form-tree/div/div/div/div/div/div/input")), options.chronos.time_out, `текстовое поле с меткой "Адрес проживания" не найдено!`)
                .then(async function (el) {
                    await el.click();
                    await el.clear();
                    await el.sendKeys(user.address);
                });

                await driver.sleep(options.chronos.think_time);


                await driver.wait(until.elementLocated(By.xpath("//div[3]/div/ul/li")), options.chronos.time_out, `первый элемент списка адресов не найден!`)
                .then(async function (el) {
                    await el.click();
                });

                await driver.sleep(options.chronos.think_time);


                await driver.wait(until.elementLocated(By.xpath("//span[contains(.,'Тип обращения')]")), options.chronos.time_out, `element whose visible text matches the string "Тип обращения" was not located!`)
                .then(async function (el) {
                    await el.click();
                });
                
                await driver.sleep(options.chronos.think_time);


                await driver.wait(until.elementLocated(By.linkText("Уточнить адрес")), options.chronos.time_out, `hyperlink element whose visible text matches the string "Уточнить адрес" was not located!`)
                .then(el => {
                    el.click();
                });
                
                await driver.sleep(options.chronos.think_time);


                await driver.wait(until.elementLocated(By.id("form.Step_1_FL.PersonAddressesData.Addresses.addressLiveFias.PanelControls.PanelHandFields.PanelHBBA.PanelHBBAWrap.PanelApartment.Apartment")), options.chronos.time_out, `element that points to the id name "form.Step_1_FL.PersonAddressesData.Addresses.addressLiveFias.PanelControls.PanelHandFields.PanelHBBA.PanelHBBAWrap.PanelApartment.Apartment" and whose label matches the string "Кв." was not located!`)
                .then(async () => {

                    let apartment = await driver.findElement(By.id("form.Step_1_FL.PersonAddressesData.Addresses.addressLiveFias.PanelControls.PanelHandFields.PanelHBBA.PanelHBBAWrap.PanelApartment.Apartment")).getAttribute("value");
                    console.log(`${newLineChar}Значение, извлеченное из поля "Кв.": ${apartment}`);

                    if (!Boolean(apartment)) {
                        
                        await driver.wait(until.elementLocated(By.xpath('(//i)[23]')), options.chronos.time_out, `checkbox element whose label matches the string "Нет квартиры" was not located!`)
                        .then(el => {
                            el.click();
                        });
                    
                    }
                });
                
                await driver.sleep(options.chronos.think_time);

                /*

                await driver.wait(until.elementLocated(By.id("form.Step_1_FL.PersonAddressesData.Addresses.addressLiveFias.PanelControls.PanelHandFields.PanelHBBA.PanelHBBAWrap.PanelApartment.Apartment")), options.chronos.time_out, `element that points to the id name "form.Step_1_FL.PersonAddressesData.Addresses.addressLiveFias.PanelControls.PanelHandFields.PanelHBBA.PanelHBBAWrap.PanelApartment.Apartment" and whose label matches the string "Кв." was not located!`)
                .then(function (el) {
                    driver.executeScript("arguments[0].scrollIntoView()", el);
                });
                
                await driver.sleep(options.chronos.think_time);
                
                
                await driver.wait(until.elementLocated(By.xpath('(//i)[23]')), options.chronos.time_out, `checkbox element whose label matches the string "Нет квартиры" was not located!`)
                .then(el => {
                    el.click();
                });
                
                await driver.sleep(options.chronos.think_time);
                
                */
                
                await driver.wait(until.elementLocated(By.xpath("//span[contains(.,'Тип обращения')]")), options.chronos.time_out, `element whose visible text matches the string "Тип обращения" was not located!`)
                .then(function (el) {
                    driver.executeScript("arguments[0].scrollIntoView()", el);
                });
                
                await driver.sleep(options.chronos.think_time);
                
                
                await driver.wait(until.elementLocated(By.xpath("(//i)[90]")), options.chronos.time_out, `radio button whose label matches the string "Взыскатель" was not located!`)
                .then(el => {
                    el.click();
                });
                
                await driver.sleep(options.chronos.think_time);
                
                
                await driver.wait(until.elementLocated(By.xpath("//span[contains(.,'Выбор типа обращения')]")), options.chronos.time_out, `element whose visible text matches the string "Выбор типа обращения" was not located!`)
                .then(function (el) {
                    driver.executeScript("arguments[0].scrollIntoView()", el);
                });
                
                await driver.sleep(options.chronos.think_time);
                
                
                await driver.wait(until.elementLocated(By.xpath("//label[contains(.,'Жизненная ситуация')]")), options.chronos.time_out, `label whose visible text matches the string "Жизненная ситуация" was not located!`)
                .then(el => {
                    el.click();
                });
                
                await driver.sleep(options.chronos.think_time);
                
                
                await driver.wait(until.elementLocated(By.xpath("//li[contains(.,'Хочу пожаловаться на действия судебного пристава-исполнителя')]")), options.chronos.time_out, `the list item which contains visible text "Хочу пожаловаться на действия судебного пристава-исполнителя" was not located!`)
                .then(el => {
                    el.click();
                });
                
                await driver.sleep(options.chronos.think_time);
                
                
                await driver.wait(until.elementLocated(By.xpath("//label[contains(.,'Уточните жизненную ситуацию')]")), options.chronos.time_out, `label whose visible text matches the string "Уточните жизненную ситуацию" was not located!`)
                .then(el => {
                    el.click();
                });
                
                await driver.sleep(options.chronos.think_time);
                
                
                await driver.wait(until.elementLocated(By.xpath("//li[contains(.,'Я не согласен с действием или бездействием судебного пристава-исполнителя')]")), options.chronos.time_out, `the list item which contains visible text "Я не согласен с действием или бездействием судебного пристава-исполнителя" was not located!`)
                .then(el => {
                    el.click();
                });
                
                await driver.sleep(options.chronos.think_time);
                
                
                await driver.wait(until.elementLocated(By.xpath("//label[contains(.,'Является ли данное обращение повторным?')]")), options.chronos.time_out, `label whose visible text matches the string "Является ли данное обращение повторным?" was not located!`)
                .then(function (el) {
                    driver.executeScript("arguments[0].scrollIntoView()", el);
                });
                
                await driver.sleep(options.chronos.think_time);
                
                
                await driver.wait(until.elementLocated(By.xpath("(//i)[96]")), options.chronos.time_out, `radio button whose label matches the string "Нет" was not located!`)
                .then(el => {
                    el.click();
                });
                
                await driver.sleep(options.chronos.think_time);


                field_values = field_generator.create_values(processed_data[i]);


                await driver.wait(until.elementLocated(By.xpath("//label[contains(.,'Номер исполнительного производства')]")), options.chronos.time_out, `label whose visible text matches the string "Номер исполнительного производства" was not located!`)
                .then(el => {
                   el.click();
                });
       
                await driver.sleep(options.chronos.think_time);
       
       
                await driver.wait(until.elementLocated(By.id("form.Step_Application_type.Panel_Application_type.Panel_JS.IpNum")), options.chronos.time_out, `element that points to the id name "form.Step_Application_type.Panel_Application_type.Panel_JS.IpNum" and whose label matches the string "Номер исполнительного производства" was not located!`)
                .then(el => {
                   console.log(`${newLineChar}Номер исполнительного производства: ${field_values.DeloNum}`);
                   el.sendKeys(field_values.DeloNum);
                });
       
                await driver.sleep(options.chronos.think_time);
       
       
                await driver.wait(until.elementLocated(By.xpath("//form-tree[12]/div/div/div")), options.chronos.conditional_expectation, `element with xpath '//form-tree[12]/div/div/div' was not located`)
                .then(async function (el) {
                   skipSign = String(await el.getAttribute("innerHTML"));
                })
                .catch(e => {
                   if (e.name !== 'TimeoutError') throw e
                });
       
                await driver.sleep(options.chronos.think_time);
       
       
                await driver.wait(until.elementLocated(By.xpath("//span[contains(.,'Сведения о должностном лице, на которое подается жалоба')]")), options.chronos.time_out, `element whose visible text matches the string "Сведения о должностном лице, на которое подается жалоба" was not located!`)
                .then(function (el) {
                   driver.executeScript("arguments[0].scrollIntoView()", el);
                });
       
                await driver.sleep(options.chronos.think_time);
       
       
                await driver.wait(until.elementLocated(By.xpath("(//i)[102]")), options.chronos.time_out, `radio button whose label matches the string "Отдел судебных приставов ФССП России" was not located!`)
                .then(el => {
                   el.click();
                });
       
                await driver.sleep(options.chronos.think_time);
       
       
                await driver.wait(until.elementLocated(By.xpath("//label[contains(.,'Наименование должности')]")), options.chronos.time_out, `label whose visible text matches the string "Наименование должности" was not located!`)
                .then(el => {
                   el.click();
                });
       
                await driver.sleep(options.chronos.think_time);
       
       
                await driver.wait(until.elementLocated(By.xpath("//li[contains(.,'Судебный пристав-исполнитель')]")), options.chronos.time_out, `the list item which contains visible text "Судебный пристав-исполнитель" was not located!`)
                .then(el => {
                   el.click();
                });
       
                await driver.sleep(options.chronos.think_time);
       
       
                await driver.wait(until.elementLocated(By.id("form.FormStep_I_COMPLAINT_IP.PanelComplained.PanelComplainedSurname.ComplainedSurname")), options.chronos.time_out, `element that points to the id name "form.FormStep_I_COMPLAINT_IP.PanelComplained.PanelComplainedSurname.ComplainedSurname" and whose label matches the string "Фамилия" was not located!`)
                .then(el => {
                   el.click();
                   return el;
                }).then(el => {
                   console.log(`Фамилия, на кого подается жалоба: ${field_values.ComplainedSurname}`);
                   el.sendKeys(field_values.ComplainedSurname);
                });
       
                await driver.sleep(options.chronos.think_time);
       
       
                await driver.wait(until.elementLocated(By.id("form.FormStep_I_COMPLAINT_IP.PanelComplained.PanelComplainedName.ComplainedName")), options.chronos.time_out, `element that points to the id name "form.FormStep_I_COMPLAINT_IP.PanelComplained.PanelComplainedName.ComplainedName" and whose label matches the string "Имя" was not located!`)
                .then(el => {
                   el.click();
                   return el;
                }).then(el => {
                   console.log(`Имя, на кого подается жалоба: ${field_values.ComplainedName}`);
                   el.sendKeys(field_values.ComplainedName);
                });
       
                await driver.sleep(options.chronos.think_time);
       
       
                await driver.wait(until.elementLocated(By.id("form.FormStep_I_COMPLAINT_IP.PanelComplained.PanelComplainedMiddlename.ComplainedMiddlename")), options.chronos.time_out, `element that points to the id name "form.FormStep_I_COMPLAINT_IP.PanelComplained.PanelComplainedMiddlename.ComplainedMiddlename" and whose label matches the string "Отчество" was not located!`)
                .then(el => {
                   el.click();
                   return el;
                }).then(el => {
                   console.log(`Отчество, на кого подается жалоба: ${field_values.ComplainedMiddlename}`);
                   el.sendKeys(field_values.ComplainedMiddlename);
                });
       
                await driver.sleep(options.chronos.think_time);
       
       
                await driver.wait(until.elementLocated(By.xpath("//span[contains(.,'Дополнительная информация текущего обращения')]")), options.chronos.time_out, `element whose visible text matches the string "Дополнительная информация текущего обращения" was not located!`)
                .then(function (el) {
                   driver.executeScript("arguments[0].scrollIntoView()", el);
                });
       
                await driver.sleep(options.chronos.think_time);
       
       
                await driver.wait(until.elementLocated(By.id("form.FormStep_AddInformation.PanelAddInfo.PanelTextShort.TextShort")), options.chronos.time_out, `element that points to the id name "form.FormStep_AddInformation.PanelAddInfo.PanelTextShort.TextShort" and whose label matches the string "Тема обращения" was not located!`)
                .then(el => {
                   el.sendKeys(field_values.TextShort);
                });
       
                await driver.sleep(options.chronos.think_time);
       
       
                await driver.wait(until.elementLocated(By.id("form.FormStep_AddInformation.PanelAddInfo.PanelTextShort.Text")), options.chronos.time_out, `element that points to the id name "form.FormStep_AddInformation.PanelAddInfo.PanelTextShort.Text" and whose label matches the string "Описание, максимум 9000 символов" was not located!`)
                .then(el => {
                   el.click();
                   return el;
                }).then(async function (el) {
                   await driver.executeScript(`document.getElementById('form.FormStep_AddInformation.PanelAddInfo.PanelTextShort.Text').value=\`${field_values.Text}\``);
                   await el.sendKeys("-", Key.BACK_SPACE);
                });
       
                await driver.sleep(options.chronos.think_time);
       
       
                await driver.wait(until.elementLocated(By.xpath("//input[contains(@accept,'.xml,.odt,application/pdf,text/plain,application/zip,application/vnd.ms-excel,image/tiff,text/html,application/msword,.ods,image/jpeg,image/gif,image/png,.rpl,.bin,text/rtf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.7z,.rar')]")), options.chronos.time_out, `a file-select field was not located!`)
                .then(el => {
                   console.log(`Доверенность: ${field_values.File}`);
                   el.sendKeys(field_values.File);
                });
                
                await driver.sleep(options.chronos.think_time);
       
                

                await driver.wait(until.elementIsVisible(driver.findElement(By.css(".removeFileDnD"))), options.chronos.time_out, `reset element for file-select field which can be located by CSS Selector ".removeFileDnD" was not found!`)
                .then(async () => {
       
                   await driver.findElement(By.xpath("//span[contains(.,'Сведения о получателе')]"))
                   .then(async (el) => {
                      await driver.executeScript("arguments[0].scrollIntoView()", el);
                   }).then(async () => {
                      
                      let region = await driver.findElement(By.xpath("//form-tree[20]/epgu-form-step/div/div/div/div[4]/form-tree/epgu-panel/div/div/div/div/div/form-tree[2]/epgu-panel/div/div/div[2]/div/div/form-tree/div/div/div")).getAttribute("innerText");
                      
                      cache.set("region", region);
                      console.log(`${newLineChar}Регион подразделения, в которое отправляется заявление: ${region}`);
       
                      let unit   = await driver.findElement(By.xpath("//form-tree[3]/epgu-panel/div/div/div[2]/div/div/form-tree/div/div/div")).getAttribute("innerText");
                      
                      cache.set("unit", unit);
                      console.log(`${newLineChar}Подразделение, в которое отправляется заявление: ${unit}`);
                      
                   }).then(async () => {
       
                      let retry_indicator = true;
       
                      while (retry_indicator) {
                         if (cache.get("region") && cache.get("unit")){
                            retry_indicator = false;
                         }
                      }
       
                      await driver.findElement(By.id("form.NavPanel.__nextStep")).click();
                   })

                });
       
                await driver.sleep(options.chronos.think_time);
       
       

                if ((skipSign) && (cache.get("unit") === "текст")) {
       
                   let object            = processed_data[i];  
                   object.skipReason     = skipSign;

                   console.log(`${newLineChar}Внимание! Не удалось определить отдел судебных приставов. Проверьте ${invalid_data_file} файл.`);
                   
                   skipSign = false;

                   await driver.get('https://www.gosuslugi.ru/404402/1/form');
                   

                   fs.appendFileSync(options.directory_tree.output_path + invalid_data_file, `${newLineChar}` + JSON.stringify(object) + ',');
                   processed_data.pop();
                   csv_handler.csv_writer(options.directory_tree.verified_data_path + cache.get("new_fileName"), csv_headers.applier_recovery, processed_data);

                   restart_monitor    = new restarter(processed_data[processed_data.length - 1], options.chronos.restart_attempts);

                   console.timeEnd(`${newLineChar}Заявление подано за`);


                   continue;

                }


                await driver.wait(until.elementLocated(By.linkText("Не изменять")), options.chronos.time_out, `hyperlink element whose visible text matches the string "Не изменять" was not located!`)
                .then(async function (el) {
                    await driver.wait(until.elementIsVisible(el), options.chronos.time_out, "hyperlink element whose visible text matches the string 'Не изменять' is not visible!")
                    .then(el => {
                       el.click();
                    })
                 });
        
                 await driver.sleep(options.chronos.think_time);
        
        
                 await driver.wait(until.elementLocated(By.xpath("//h2[contains(.,\'Подача заявлений, ходатайств, объяснений, отводов, жалоб в порядке подчиненности по исполнительному производству\')]")), options.chronos.time_out, `HTML heading tag whose visible text contains the string "Подача заявлений, ходатайств, объяснений, отводов, жалоб в порядке подчиненности по исполнительному производству" was not located!`)
                 .then(async function (el) {

                    let object               = processed_data[i];
        
                    object.Region            = cache.get("region");
                    object.Unit              = cache.get("unit");
        
                    object.ServiceType       = await el.getText();

                    object.Claimant          = user.claimant;

                    object.ApplicationID     = await driver.wait(until.elementLocated(By.xpath("//lk-order-header/div/div[2]")), options.chronos.time_out, `element whose visible text contains an application number and which can be located by xpath "//lk-order-header/div/div[2]" was not found!`).then(el => { return el.getText() } );
                    object.ApplicationID     = object.ApplicationID.match(/\d+/)[0];
        
                    object.StatusLastUpdated = await driver.wait(until.elementLocated(By.css(".date")), options.chronos.time_out, `element whose visible text contains the registration date and which can be located by css ".date" was not found!`).then(el => { return el.getText() } );
                    object.StatusLastUpdated = object.StatusLastUpdated.replace(/(\d{2}).(\d{2}).(\d{4})/, "$2.$1.$3")
        
                    object.ApplicationDate   = object.StatusLastUpdated;
                   
                    object.Status            = await driver.wait(until.elementLocated({ xpath: '//h5/span'}), options.chronos.time_out, `element which can be located by xpath '//h5/span' and whose visible text contains the current status of application was not found!`).then(async function (el) { return await el.getAttribute("innerHTML"); });
                    
                    object.Submission        = "ЕПГУ";
        
                    object.DirectLink        = await driver.getCurrentUrl();
        
                    console.log(`${newLineChar}${('0' + new Date().getDate()).slice(-2) + '.' + ('0' + (new Date().getMonth() + 1)).slice(-2) + '.' + new Date().getFullYear()} в ${new Date().getHours()}:${('0' + new Date().getMinutes()).slice(-2)}:${('0' + new Date().getSeconds()).slice(-2)} заявление: "${object.Status}"`);
                    console.log(`${newLineChar}${JSON.stringify(object)}`);
        
        
                    fs.appendFile(options.directory_tree.output_path + inter_process_file, `${newLineChar}` + JSON.stringify(object) + ',', function(error) {
                       if (error) throw error;
                       console.log(`${newLineChar}Запись ${inter_process_file} файла завершена!`);
                    });

                    processed_data.pop();
                    csv_handler.csv_writer(options.directory_tree.verified_data_path + cache.get("new_fileName"), csv_headers.applier_recovery, processed_data);
                    restart_monitor    = new restarter(processed_data[processed_data.length - 1], options.chronos.restart_attempts);
                 })
                 .then(function () {
                    driver.get('https://www.gosuslugi.ru/404402/1/form');
                 });
        
                 await driver.sleep(options.chronos.think_time);

                 console.timeEnd(`${newLineChar}Заявление подано за`);
       
            }
        }
        
        let emptiness = ["", "[]", "{}", "[{}]", undefined, null];
        
        if (emptiness.includes(JSON.stringify(await csv_handler.csv_parser(options.directory_tree.verified_data_path + processingFile)))) {
            fs.unlink(options.directory_tree.verified_data_path + processingFile, (err) => {
                if (err) {
                    if (err.code === 'ENOENT') {
                        console.log (`${newLineChar}${processingFile} has already been removed!`)
                    }
                } else {
                    console.log(`${newLineChar}${processingFile} was deleted!`)
                }
            })
        }
        
        if (fs.existsSync(options.directory_tree.output_path + inter_process_file)) {

            let prefix = uuid.v4();
            
            emitter.emit(await csv_handler.json_layer_for_csv(options.directory_tree.output_path + inter_process_file), options.directory_tree.ready_path + prefix + "_" + inter_process_file.match(/\d+/)[0] + ".csv", 
                         csv_headers.applier_ready, JSON.parse(fs.readFileSync(options.directory_tree.output_path + inter_process_file, "utf8")), options.directory_tree.output_path, inter_process_file, prefix)
                        
        } else {
            console.log(`${newLineChar}${inter_process_file} does not exist!`);
        }


        if (fs.existsSync(options.directory_tree.output_path + invalid_data_file)) {

            let prefix = uuid.v4();
            
            emitter.emit(await csv_handler.json_layer_for_csv(options.directory_tree.output_path + invalid_data_file), options.directory_tree.ready_path + prefix + "_" + invalid_data_file.match(/\d+/)[0] + ".csv",
                         csv_headers.applier_failed, JSON.parse(fs.readFileSync(options.directory_tree.output_path + invalid_data_file, "utf8")), options.directory_tree.output_path, invalid_data_file, prefix)
                        
        } else {
            console.log(`${newLineChar}${invalid_data_file} does not exist!`);
        }
                        
        cache.clear();

        console.timeEnd(`${newLineChar}Заявления поданы за`);

    }

    fs.readFile("users.json", "utf8", function (error, users) {
            
        if (error) throw error;
        
        users = JSON.parse(users);
        
        users[userIndex]["isFree"] = true;
        fs.writeFileSync("users.json", JSON.stringify(users));
            
        console.log(`${newLineChar}'${user.claimant}' status was successfully updated!`);
    });
    

} catch (error) {

    console.error(`${newLineChar}${error.name} occured! Error's message: ${error.message}`);
    
    if (!restart_monitor.decision) {
        
        fs.rename(options.directory_tree.verified_data_path + cache.get("new_fileName"), options.directory_tree.verified_data_path + cache.get("old_fileName"), function (err) {
            if (err) throw err;
            console.log(`${newLineChar}${cache.get("new_fileName")} was renamed ${cache.get("old_fileName")}`);
        });


        fs.readFile("users.json", "utf8", function (error, users) {
    
            if (error) throw error;
    
            users = JSON.parse(users);
                    
            users[userIndex]["isFree"] = true;
            fs.writeFileSync("users.json", JSON.stringify(users));
            
            console.log(`${newLineChar}'${user.claimant}' status was successfully updated!`);
        });
    
    }

    restart_monitor.do(executor, options.chronos.restart_delay)

} finally {
    driver.quit()
}

})();