import { SmartBuffer, SmartBufferOptions } from 'smart-buffer';
import fs = require('fs');

interface TestRecordInfo {
    testName: string;
    offset: number;
    length: number;
}

const ASCII_ENCODING: any = "ascii";
const UNICODE_ENCODING: any = "utf8";
const HEADER: string = "SLPTC01";

export class PerTestCoverageFileReader {
    public constructor(private fileHandle: number) {
    }

    public getTestNames() {
        return Object.keys(this.testRecords);
    }

    public read(callback: (err: Error) => void) {
        this.readHeader(err => {
            if (err) return callback(err);
            this.readRecordHeaders(err => {
                if (err) return callback(err);
                return callback(null);
            });
        });
    }

    private readHeader(callback: (err: Error) => void) {
        var wantedHeader = this.getFileHeader();
        var bufferSize = wantedHeader.byteLength;
        var tempBuffer = new Buffer(bufferSize);
        fs.read(this.fileHandle, tempBuffer, 0, bufferSize, 0, (err) => {
            if (err) return callback(err);
            var compareResult = tempBuffer.compare(wantedHeader);
            if (compareResult == 0) return callback(null);
            return callback(new Error("Invalid file signature"));
        });
    }

    private readRecordHeaders(callback: (err: Error) => void) {
        var tempBuffer = new Buffer(8); //unsigned long (32 bit = 4 bytes) for record count + another 4 bytes for total header size
        fs.read(this.fileHandle, tempBuffer, 0, 8, HEADER.length, (err) => {
            if (err) return callback(err);
            var smartBuf = new SmartBuffer(tempBuffer);
            var headerCount = smartBuf.readUInt32LE();
            var testHeaderSize = smartBuf.readUInt32LE();
            smartBuf.clear();

            tempBuffer = new Buffer(testHeaderSize);
            fs.read(this.fileHandle, tempBuffer, 0, testHeaderSize, HEADER.length + 8, (err) => {
                if (err) return callback(err);
                var smartBuf = new SmartBuffer(tempBuffer);

                for (var i = 0; i < headerCount; i++) {
                    var testName = smartBuf.readStringNT(UNICODE_ENCODING);
                    var testOffset = smartBuf.readUInt32LE();
                    var byteLength = smartBuf.readUInt32LE();
                    this.testRecords[testName] = {
                        length: byteLength,
                        offset: testOffset,
                        testName: testName
                    };
                }
                return callback(null);
            });
        });
    }

    private getFileHeader() {
        let packet = new SmartBuffer();
        packet.writeString(HEADER, ASCII_ENCODING);
        var buf = packet.toBuffer();
        return buf;
    }

    public getTestData(testName: string, callback: (err: Error, data?: Buffer) => void) {
        var testRecord = this.testRecords[testName];
        if (!testRecord) throw new Error("Invalid/unknown test name: " + testName);

        var tempBuffer = new Buffer(testRecord.length);
        fs.read(this.fileHandle, tempBuffer, 0, testRecord.length, testRecord.offset, (err) => {
            if (err) return callback(err);
            callback(null, tempBuffer);
        });
    };


    private testRecords: { [testName: string]: TestRecordInfo } = {};
}