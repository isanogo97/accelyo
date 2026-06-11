/**
 * Writer ZIP minimal "stored" (methode 0, sans compression).
 * ----------------------------------------------------------------
 * Suffisant pour construire un conteneur .pkpass (Apple Wallet):
 * un .pkpass n'est qu'une archive ZIP de fichiers a plat
 * (pass.json, manifest.json, signature, icones...).
 *
 * Implementation 100% lib standard Node (Buffer): aucune dependance
 * externe. CRC-32 calcule a la main (table standard PKZIP/PNG).
 *
 * Pas de dossiers, pas de Zip64 (les passes sont minuscules), pas de
 * data descriptor: on connait CRC/taille avant d'ecrire chaque entree.
 */

// -- CRC-32 (polynome 0xEDB88320, reflechi) -----------------------

const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

interface ZipFile {
  name: string;
  data: Buffer;
}

interface CentralEntry {
  nameBuf: Buffer;
  crc: number;
  size: number;
  offset: number;
}

const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_END = 0x06054b50;

/**
 * Construit une archive ZIP valide (stored / methode 0) a partir de la
 * liste de fichiers fournie. Retourne le Buffer complet de l'archive.
 */
export function createZip(files: ZipFile[]): Buffer {
  const localChunks: Buffer[] = [];
  const central: CentralEntry[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBuf = Buffer.from(file.name, 'utf8');
    const data = file.data;
    const crc = crc32(data);
    const size = data.length;

    // Local file header (30 octets fixes + nom + data).
    const header = Buffer.alloc(30);
    header.writeUInt32LE(SIG_LOCAL, 0);
    header.writeUInt16LE(20, 4); // version needed to extract (2.0)
    header.writeUInt16LE(0, 6); // general purpose bit flag
    header.writeUInt16LE(0, 8); // compression method = 0 (stored)
    header.writeUInt16LE(0, 10); // mod time
    header.writeUInt16LE(0x21, 12); // mod date (1980-01-01 valide)
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(size, 18); // compressed size
    header.writeUInt32LE(size, 22); // uncompressed size
    header.writeUInt16LE(nameBuf.length, 26);
    header.writeUInt16LE(0, 28); // extra field length

    localChunks.push(header, nameBuf, data);

    central.push({ nameBuf, crc, size, offset });
    offset += header.length + nameBuf.length + data.length;
  }

  // Central directory.
  const centralChunks: Buffer[] = [];
  let centralSize = 0;
  for (const entry of central) {
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(SIG_CENTRAL, 0);
    cd.writeUInt16LE(20, 4); // version made by
    cd.writeUInt16LE(20, 6); // version needed
    cd.writeUInt16LE(0, 8); // flags
    cd.writeUInt16LE(0, 10); // compression = stored
    cd.writeUInt16LE(0, 12); // mod time
    cd.writeUInt16LE(0x21, 14); // mod date
    cd.writeUInt32LE(entry.crc, 16);
    cd.writeUInt32LE(entry.size, 20); // compressed size
    cd.writeUInt32LE(entry.size, 24); // uncompressed size
    cd.writeUInt16LE(entry.nameBuf.length, 28);
    cd.writeUInt16LE(0, 30); // extra field length
    cd.writeUInt16LE(0, 32); // comment length
    cd.writeUInt16LE(0, 34); // disk number start
    cd.writeUInt16LE(0, 36); // internal attrs
    cd.writeUInt32LE(0, 38); // external attrs
    cd.writeUInt32LE(entry.offset, 42); // offset of local header

    centralChunks.push(cd, entry.nameBuf);
    centralSize += cd.length + entry.nameBuf.length;
  }

  const centralOffset = offset;

  // End of central directory record (22 octets).
  const end = Buffer.alloc(22);
  end.writeUInt32LE(SIG_END, 0);
  end.writeUInt16LE(0, 4); // disk number
  end.writeUInt16LE(0, 6); // central dir start disk
  end.writeUInt16LE(central.length, 8); // entries on this disk
  end.writeUInt16LE(central.length, 10); // total entries
  end.writeUInt32LE(centralSize, 12); // central dir size
  end.writeUInt32LE(centralOffset, 16); // central dir offset
  end.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...localChunks, ...centralChunks, end]);
}
