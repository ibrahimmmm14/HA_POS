// Helper to encode TLV (Tag-Length-Value) for ZATCA E-Invoicing QR Code
export function generateZatcaTlvBase64(
  sellerName: string,
  vatNumber: string,
  timestamp: string,
  totalWithVat: string,
  vatTotal: string
): string {
  function getTlvTag(tagNum: number, tagValue: string): Uint8Array {
    const encoder = new TextEncoder();
    const valBytes = encoder.encode(tagValue);
    const tagBytes = new Uint8Array(2 + valBytes.length);
    tagBytes[0] = tagNum;
    tagBytes[1] = valBytes.length;
    tagBytes.set(valBytes, 2);
    return tagBytes;
  }

  try {
    const tag1 = getTlvTag(1, sellerName);
    const tag2 = getTlvTag(2, vatNumber);
    const tag3 = getTlvTag(3, timestamp);
    const tag4 = getTlvTag(4, totalWithVat);
    const tag5 = getTlvTag(5, vatTotal);

    const totalLen = tag1.length + tag2.length + tag3.length + tag4.length + tag5.length;
    const combined = new Uint8Array(totalLen);

    let offset = 0;
    for (const tag of [tag1, tag2, tag3, tag4, tag5]) {
      combined.set(tag, offset);
      offset += tag.length;
    }

    if (typeof Buffer !== 'undefined') {
      return Buffer.from(combined).toString('base64');
    } else {
      let binary = '';
      for (let i = 0; i < combined.byteLength; i++) {
        binary += String.fromCharCode(combined[i]);
      }
      return btoa(binary);
    }
  } catch (e) {
    return 'BASE64_QR_CODE_PLACEHOLDER';
  }
}
