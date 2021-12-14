const newLineChar = process.platform === 'win32' ? '\r\n' : '\n';

const Emitter     = require("events");
const fs          = require('fs');

const options     = require('./settings.js');
const csv_handler = require('./csv-handler.js');

const uuid        = require('uuid');


let emitter = new Emitter();


emitter.on("done", function file_removal (path_to_file) {
    
    fs.unlink(path_to_file, (err) => {

        if (err) {
            if (err.code === 'ENOENT') {
                console.log (`${newLineChar}'${path_to_file}' has already been removed!`);
            }
        }

        else console.log(`${newLineChar}'${path_to_file}' was deleted!`);
    
    });

});



module.exports.chunker = function chunker (working_directory, destination_folder, csv_headers) {

    try {

        if (typeof(options.chronos.chunking_max_limitation) !== "number" || typeof(options.chronos.chunking_oscillation) !== "number")  {
            
            let error  = new Error("wrong data type of 'chunking_max_limitation' or 'chunking_oscillation' variable value in settings! Number is expected!");
            error.name = 'SettingsError';
            
            throw error;
        }


        fs.readdir(working_directory, { withFileTypes: true }, function (error, dirents) {
            
            if (error) throw error;

            let working_directory_files = dirents.filter(dirent => dirent.isFile()).map(dirent => dirent.name);

            if (working_directory_files.length === 0) {

                console.log(`${newLineChar}'${working_directory}' folder is empty and data migration to '${destination_folder}' folder has been finished! Nothing to process...`);

            } else {

                fs.readdir(destination_folder, { withFileTypes: true }, function (error, dirents) {

                    let destination_folder_files = dirents.filter(dirent => dirent.isFile()).map(dirent => dirent.name);

                    if (error) throw error;

                    destination_folder_indexed_files = destination_folder_files.filter(function (item) {
                        if (/\d+_waiting.csv|\d+_processing.csv/.test(item)) return true;
                    });

                    let numerator;

                    if (destination_folder_indexed_files.length !== 0) {
                        numerator = Math.max.apply(null, destination_folder_indexed_files.map(item => Number(item.match(/\d+/)[0]))) + 1;
                    } else numerator = 1;

                    csv_handler.csv_parser(working_directory + working_directory_files[0]).then(file_content => {
                        
                        if (file_content.length > options.chronos.chunking_max_limitation) {
                            
                            let size          = file_content.length/2;
                            let splited_array = [];
                            
                            for (let i = 0; i < Math.ceil(file_content.length/size); i++){
                                splited_array[i] = file_content.slice((i*size), (i*size) + size);
                            }

                            csv_handler.csv_writer(working_directory + working_directory_files[0], csv_headers, splited_array[0]);
                            csv_handler.csv_writer(working_directory + uuid.v4() + ".csv", csv_headers, splited_array[1]);
                        
                        } else {
                            
                            csv_handler.csv_writer(destination_folder + `${numerator}_waiting.csv`, csv_headers, file_content)
                            .then(event => {
                                emitter.emit(event, working_directory + working_directory_files[0]);
                            });
                        }
                    
                    })
                })

                setTimeout(chunker, options.chronos.chunking_oscillation, working_directory, destination_folder, csv_headers);
            }
        });
    
    } catch (error) {
        console.error(`${newLineChar}${error.name} occured in '${chunker.name}' function! Error's message: ${error.message}`);
    }
};