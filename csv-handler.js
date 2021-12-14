const newLineChar = process.platform === 'win32' ? '\r\n' : '\n';

const fs              = require('fs');

const csv             = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const stripBom        = require('strip-bom-stream');


module.exports.csv_parser = function (csv_file) {
    
    let result = [];
    
    return new Promise ((resolve, reject) => {
        fs.createReadStream(csv_file)
        .pipe(stripBom())
        .pipe(csv({separator: ';'}))
        .on('error', (err) => reject(err))
        .on('data', (data) => result.push(data))
        .on('end', () => resolve(result))
    })

}


module.exports.csv_writer = async function (path_to_csv_file, csv_headers, array_of_objects)  {

    let csvWriter = createCsvWriter({
        path: path_to_csv_file, 
        header: csv_headers, 
        fieldDelimiter: ';'
    });

    await csvWriter.writeRecords(array_of_objects);
    console.log(`${newLineChar}The data was written successfully to: ${path_to_csv_file}`);

    fs.writeFileSync(path_to_csv_file, "\uFEFF" + fs.readFileSync(path_to_csv_file, "utf8"));
    console.log(`${newLineChar}'${path_to_csv_file}' file was converted to UTF-8 successfully!`);

    return "done"

}


module.exports.json_layer_for_csv = async function (path_to_json) {
         
    try {
        
        let arr_obj,
            buff = fs.readFileSync(path_to_json, 'utf8');
            
        try {
            arr_obj = JSON.parse(buff);
        } catch (e) {
            if (e.name === 'SyntaxError') {
                arr_obj = JSON.parse("[" + buff.replace(newLineChar, "").slice(0, -1) + "]");
            } else throw e;
        }
        
        fs.writeFileSync(path_to_json, JSON.stringify(arr_obj))
        
        return "done";
    
    } catch (err) {
        console.log(`An error occured while executing '${json_layer_for_csv.name}' function! Error: ` + console.err);
        throw err
    }

}