import { SmartBuffer, SmartBufferOptions } from 'smart-buffer';

interface PendingPerTestCoverageData {
    testName: string;
    hitsArray: Buffer;
}

const ASCII_ENCODING: any = "ascii";
const UNICODE_ENCODING: any = "utf8";
const HEADER: string = "SLPTC01";

export class PerTestCoverageFileWriter {
    private testRecords: PendingPerTestCoverageData[] = [];

    public addTestData(testName: string, hitsArray: Buffer) {
        if (!testName) throw new Error("testName is required");
        if (!hitsArray) throw new Error("hitsArray is required");
        if (hitsArray.length == 0) return; //No need to store anything
        this.testRecords.push({ testName: testName, hitsArray: hitsArray });
        //TODO: Store hits array in temporary file, so we won't use up that much memory
    }

    public writeToStream(outputStream: NodeJS.WritableStream, cb: (err: Error) => void) {
        var testRecordsHeaderSize = this.calculateTestRecordsHeaderSize();

        var fileHeaderBuffer = this.createFileHeader(testRecordsHeaderSize);
        outputStream.write(fileHeaderBuffer, (err) => {
            if (err) return cb(err);           

            var currentDataOffset: number = fileHeaderBuffer.byteLength + testRecordsHeaderSize;
            var packet = new SmartBuffer();

            this.testRecords.forEach(testRecord => {
                packet.writeStringNT(testRecord.testName);
                packet.writeUInt32LE(currentDataOffset);
                packet.writeUInt32LE(testRecord.hitsArray.byteLength);
                currentDataOffset += testRecord.hitsArray.byteLength;
            });

            var buf = packet.toBuffer();
            outputStream.write(buf, (err) => {
                if (err) return cb(err);

                var testIdx = 0;
                var writeNext = () => {
                    if (this.testRecords.length == testIdx) {
                        return cb(null); //We're done!
                    }
                    outputStream.write(this.testRecords[testIdx].hitsArray, (err) => {
                        if (err) return cb(err);
                        testIdx++;
                        writeNext();
                    });
                }

                writeNext();
            });
        });
    }

    private createFileHeader(testRecordsByteLength: number) {
        let packet = new SmartBuffer();
        packet.writeString(HEADER, ASCII_ENCODING);
        packet.writeUInt32LE(this.testRecords.length);
        packet.writeUInt32LE(testRecordsByteLength); //Size of all test records
        var buf = packet.toBuffer();
        return buf;
    }

    private calculateTestRecordsHeaderSize() {
        let packet = new SmartBuffer();
        this.testRecords.forEach(testRecord => {
            packet.writeStringNT(testRecord.testName, UNICODE_ENCODING);
            packet.writeUInt32LE(0); //Offset
            packet.writeUInt32LE(0); //Size
        });

        return packet.toBuffer().length;
    }
}