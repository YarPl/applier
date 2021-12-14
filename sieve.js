const newLineChar = process.platform === 'win32' ? '\r\n' : '\n';

const chunker      = require('./chunking.js').chunker;
const data_cleaner = require('./data-cleaner.js');
const options      = require('./settings.js');
const csv_headers  = require('./csv-headers.json');
const csv_handler  = require('./csv-handler.js');

const fs           = require('fs');
const Emitter      = require("events");


let emitter = new Emitter();
 

emitter.on("chunker", function (working_directory, destination_folder, csv_headers) {
    console.log(`${newLineChar}Chunker has been launched for '${working_directory}' folder!`)
    chunker(working_directory, destination_folder, csv_headers);
});



fs.readdir(options.directory_tree.storage_path, { withFileTypes: true }, function (error, dirents) {
    
    if (error) throw error;
    
    let storage_directory_files = dirents.filter(dirent => dirent.isFile()).map(dirent => dirent.name);
    
    if (storage_directory_files.length === 0) {
        console.log(`${newLineChar}'${options.directory_tree.storage_path}' folder is empty! Nothing to process...`);
    
    } else {
        
        let counter = 0;
        
        storage_directory_files.forEach(async (fileName) => {
            
            let file_content = await csv_handler.csv_parser(options.directory_tree.storage_path + fileName);
                
            let purified_file_content = file_content.map((el) => {
                return data_cleaner.purifier(el)
            });
  
            await csv_handler.csv_writer(options.directory_tree.storage_path + fileName, csv_headers.storage_enrichment, purified_file_content).then(result => {
                if (result === "done") counter += 1;
                if (counter === storage_directory_files.length) emitter.emit("chunker", options.directory_tree.storage_path, options.directory_tree.enrichment_path, csv_headers.storage_enrichment);
            });
        
        });

    }

});



fs.readdir(options.directory_tree.raw_data_path, { withFileTypes: true }, function (error, dirents) {
    
    if (error) throw error;
    
    let raw_data_directory_files = dirents.filter(dirent => dirent.isFile()).map(dirent => dirent.name);
    
    if (raw_data_directory_files.length === 0) {
        console.log(`${newLineChar}'${options.directory_tree.raw_data_path}' folder is empty! Nothing to process...`);
    
    } else {

        let opened_counter = 0;
        let closed_counter = 0;

        raw_data_directory_files.forEach(async (fileName) => {
            
            let file_content = await csv_handler.csv_parser(options.directory_tree.raw_data_path + fileName);

            console.log(file_content)
            
            let purified_file_content = file_content.map((el) => {
                return data_cleaner.purifier(el)
            });

            console.log(purified_file_content)

            let opened_proceedings = [], closed_proceedings = [];

            purified_file_content.forEach(proceeding => {

                if (proceeding["Suspended"]) {
                    closed_proceedings.push(proceeding)
                } else {
                    opened_proceedings.push(proceeding)
                }

            });

            purified_file_content = null;


            if (closed_proceedings.length !== 0) {
                
                await csv_handler.csv_writer(options.directory_tree.suspended_path + fileName, csv_headers.raw_verified, closed_proceedings).then(result => {
                    if (result === "done") closed_counter += 1;
                    if ((opened_counter === raw_data_directory_files.length) && (closed_counter === raw_data_directory_files.length)) emitter.emit("chunker", options.directory_tree.raw_data_path, options.directory_tree.verified_data_path, csv_headers.raw_verified);
                });
            
            } else {
                closed_counter += 1;
                if ((opened_counter === raw_data_directory_files.length) && (closed_counter === raw_data_directory_files.length)) emitter.emit("chunker", options.directory_tree.raw_data_path, options.directory_tree.verified_data_path, csv_headers.raw_verified);
            }


            if (opened_proceedings.length !== 0) {
                
                await csv_handler.csv_writer(options.directory_tree.raw_data_path + fileName, csv_headers.raw_verified, opened_proceedings).then(result => {
                    if (result === "done") opened_counter += 1;
                    if ((opened_counter === raw_data_directory_files.length) && (closed_counter === raw_data_directory_files.length)) emitter.emit("chunker", options.directory_tree.raw_data_path, options.directory_tree.verified_data_path, csv_headers.raw_verified);
                });
            
            } else {
                opened_counter += 1;
                if ((opened_counter === raw_data_directory_files.length) && (closed_counter === raw_data_directory_files.length)) emitter.emit("chunker", options.directory_tree.raw_data_path, options.directory_tree.verified_data_path, csv_headers.raw_verified);
            }
        
        });
    
    }
 
});