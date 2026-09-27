/**
 * Pure TypeScript ZIP Archive Generator
 * Creates standard PKZip archives in-memory without external dependencies.
 */

const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0 ^ -1;
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

export interface ZipFileEntry {
  name: string;
  content: string | Uint8Array;
}

export function createZipBlob(files: ZipFileEntry[]): Blob {
  const encoder = new TextEncoder();
  const fileRecords: Array<{
    nameBytes: Uint8Array;
    contentBytes: Uint8Array;
    crc: number;
    offset: number;
  }> = [];

  const localParts: Uint8Array[] = [];
  let currentOffset = 0;

  const now = new Date();
  const dosTime =
    ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff;
  const dosDate =
    (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const contentBytes =
      typeof file.content === 'string' ? encoder.encode(file.content) : file.content;
    const fileCrc = crc32(contentBytes);
    const offset = currentOffset;

    // Local file header (30 bytes + name + content)
    const header = new Uint8Array(30);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true); // Local file header signature
    view.setUint16(4, 20, true); // Version needed to extract (2.0)
    view.setUint16(6, 0, true); // General purpose bit flag
    view.setUint16(8, 0, true); // Compression method (0 = Store)
    view.setUint16(10, dosTime, true);
    view.setUint16(12, dosDate, true);
    view.setUint32(14, fileCrc, true);
    view.setUint32(18, contentBytes.length, true); // Compressed size
    view.setUint32(22, contentBytes.length, true); // Uncompressed size
    view.setUint16(26, nameBytes.length, true); // Filename length
    view.setUint16(28, 0, true); // Extra field length

    localParts.push(header, nameBytes, contentBytes);
    currentOffset += header.length + nameBytes.length + contentBytes.length;

    fileRecords.push({
      nameBytes,
      contentBytes,
      crc: fileCrc,
      offset,
    });
  }

  // Central directory
  const centralDirStart = currentOffset;
  const centralParts: Uint8Array[] = [];

  for (const record of fileRecords) {
    const cdHeader = new Uint8Array(46);
    const view = new DataView(cdHeader.buffer);
    view.setUint32(0, 0x02014b50, true); // Central directory header signature
    view.setUint16(4, 20, true); // Version made by
    view.setUint16(6, 20, true); // Version needed to extract
    view.setUint16(8, 0, true); // Flags
    view.setUint16(10, 0, true); // Compression method (Store)
    view.setUint16(12, dosTime, true);
    view.setUint16(14, dosDate, true);
    view.setUint32(16, record.crc, true);
    view.setUint32(20, record.contentBytes.length, true);
    view.setUint32(24, record.contentBytes.length, true);
    view.setUint16(28, record.nameBytes.length, true);
    view.setUint16(30, 0, true); // Extra field length
    view.setUint16(32, 0, true); // Comment length
    view.setUint16(34, 0, true); // Disk number start
    view.setUint16(36, 0, true); // Internal attributes
    view.setUint32(38, 0, true); // External attributes
    view.setUint32(42, record.offset, true); // Relative offset of local header

    centralParts.push(cdHeader, record.nameBytes);
    currentOffset += cdHeader.length + record.nameBytes.length;
  }

  const centralDirSize = currentOffset - centralDirStart;

  // End of central directory record (22 bytes)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true); // EOCD signature
  eocdView.setUint16(4, 0, true); // Disk number
  eocdView.setUint16(6, 0, true); // Disk where central directory starts
  eocdView.setUint16(8, fileRecords.length, true); // Number of records on this disk
  eocdView.setUint16(10, fileRecords.length, true); // Total number of records
  eocdView.setUint32(12, centralDirSize, true); // Size of central directory
  eocdView.setUint32(16, centralDirStart, true); // Offset of start of central directory
  eocdView.setUint16(20, 0, true); // Comment length

  return new Blob([...localParts, ...centralParts, eocd], { type: 'application/zip' });
}
