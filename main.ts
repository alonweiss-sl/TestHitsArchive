import { PerTestCoverageFileWriter } from './lib/per-test-coverage-file-writer';
import { PerTestCoverageFileReader } from './lib/per-test-coverage-file-reader';
import fs = require('fs');

function writeSampleFile() {
    console.log('Writing sample file');

    function generateBigBuffer(size) {
        let buf = Buffer.alloc(size);
        try {
            for (var i = 0; i < size; i++) {
                buf[i] = i % 256;
            }
        } catch (e) {
            console.log(e);
        }
        console.log('done creating big buf');
        return buf;
    }

    var writer = new PerTestCoverageFileWriter();
    writer.addTestData("test1", generateBigBuffer(1024 * 1024));
    writer.addTestData("testWithשם משונה2", generateBigBuffer(1023 * 1023)); //13 methods
    writer.addTestData("שפרוטים123", Buffer.from([0, 10, 2, 7, 3, 492, 184, 209, 1, 2, 0, 0, 3]));
    var fileStream = fs.createWriteStream("./dror-big.dat");
    writer.writeToStream(fileStream, (err) => {
        if (err) console.error(err);
        fileStream.end();
        process.exit(err ? 1 : 0);
    });
}

function readSampleFile() {
    console.log('Reading sample file');
    var handle = fs.openSync("./dror-big.dat", "r");
    var reader = new PerTestCoverageFileReader(handle);
    reader.read((err) => {
        if (err) return console.error(err); 

        var testNames = reader.getTestNames();
        var readNextTest = () => {
            if (testNames.length == 0) {
                fs.closeSync(handle);
                process.exit(1);
            }
            var testName = testNames.pop();

            reader.getTestData(testName, (err, data) => {
                if (err) console.error(err); 
                console.log(testName + ": ");
                console.log(data.join());
                readNextTest();
            });
        };
        readNextTest();
    });
}

var write = 0;

write ? writeSampleFile() : readSampleFile();