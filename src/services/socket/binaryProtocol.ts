const PROTOCOL_VERSION = 1;

export type BinaryValue = string | number | boolean | null | undefined;

type FieldType = 'string' | 'double' | 'bool';

type EventSchema = {
  typeId: number;
  fields: { key: string; type: FieldType }[];
};

const EVENT_SCHEMAS: Record<string, EventSchema> = {
  notification_created: {
    typeId: 1,
    fields: [
      { key: 'id', type: 'string' },
      { key: 'title', type: 'string' },
      { key: 'body', type: 'string' },
      { key: 'createdAt', type: 'string' },
      { key: 'isRead', type: 'bool' },
    ],
  },
  course_updated: {
    typeId: 2,
    fields: [
      { key: 'id', type: 'string' },
      { key: 'title', type: 'string' },
      { key: 'progress', type: 'double' },
      { key: 'updatedAt', type: 'string' },
    ],
  },
  message_received: {
    typeId: 3,
    fields: [
      { key: 'id', type: 'string' },
      { key: 'chatId', type: 'string' },
      { key: 'senderId', type: 'string' },
      { key: 'content', type: 'string' },
      { key: 'timestamp', type: 'string' },
      { key: 'isEdited', type: 'bool' },
    ],
  },
};

const TYPE_ID_TO_EVENT: Record<number, string> = Object.fromEntries(
  Object.entries(EVENT_SCHEMAS).map(([event, schema]) => [schema.typeId, event])
);

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const wireType = {
  varint: 0,
  fixed64: 1,
  lengthDelimited: 2,
} as const;

function encodeVarint(value: number): number[] {
  const bytes: number[] = [];
  let current = value >>> 0;
  while (current > 127) {
    bytes.push((current & 0x7f) | 0x80);
    current >>>= 7;
  }
  bytes.push(current);
  return bytes;
}

function decodeVarint(buffer: Uint8Array, offset: number): [number, number] {
  let result = 0;
  let shift = 0;
  let index = offset;
  while (index < buffer.length) {
    const byte = buffer[index++];
    result |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) {
      return [result, index];
    }
    shift += 7;
  }
  throw new Error('Invalid varint encoding');
}

function encodeTag(fieldNumber: number, wt: number): number[] {
  return encodeVarint((fieldNumber << 3) | wt);
}

function encodeString(fieldNumber: number, value: string): number[] {
  const payload = Array.from(encoder.encode(value));
  return [
    ...encodeTag(fieldNumber, wireType.lengthDelimited),
    ...encodeVarint(payload.length),
    ...payload,
  ];
}

function encodeBool(fieldNumber: number, value: boolean): number[] {
  return [...encodeTag(fieldNumber, wireType.varint), ...(value ? [1] : [0])];
}

function encodeDouble(fieldNumber: number, value: number): number[] {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setFloat64(0, value, true);
  return [...encodeTag(fieldNumber, wireType.fixed64), ...Array.from(bytes)];
}

export function encodeBinaryMessage(
  event: string,
  payload: Record<string, BinaryValue>
): Uint8Array {
  const schema = EVENT_SCHEMAS[event];
  const binary: number[] = [];

  binary.push(...encodeTag(1, wireType.varint), ...encodeVarint(PROTOCOL_VERSION));

  if (schema) {
    binary.push(...encodeTag(2, wireType.varint), ...encodeVarint(schema.typeId));
    schema.fields.forEach((field, idx) => {
      const fieldNumber = idx + 10;
      const value = payload[field.key];
      if (value === null || value === undefined) return;
      if (field.type === 'string' && typeof value === 'string') {
        binary.push(...encodeString(fieldNumber, value));
      }
      if (field.type === 'bool' && typeof value === 'boolean') {
        binary.push(...encodeBool(fieldNumber, value));
      }
      if (field.type === 'double' && typeof value === 'number') {
        binary.push(...encodeDouble(fieldNumber, value));
      }
    });
  } else {
    binary.push(...encodeString(3, event));
    binary.push(...encodeString(4, JSON.stringify(payload)));
  }

  return Uint8Array.from(binary);
}

export function decodeBinaryMessage(raw: ArrayBuffer | Uint8Array): {
  event: string;
  payload: Record<string, BinaryValue>;
} {
  const bytes = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
  let offset = 0;
  let eventTypeId: number | null = null;
  let event = '';
  let jsonPayload = '';
  const payload: Record<string, BinaryValue> = {};

  while (offset < bytes.length) {
    const [tag, next] = decodeVarint(bytes, offset);
    offset = next;
    const fieldNumber = tag >> 3;
    const wt = tag & 0x7;

    if (fieldNumber === 1 || fieldNumber === 2) {
      const [v, n] = decodeVarint(bytes, offset);
      offset = n;
      if (fieldNumber === 2) eventTypeId = v;
      continue;
    }

    if (fieldNumber === 3 || fieldNumber === 4 || wt === wireType.lengthDelimited) {
      const [len, n] = decodeVarint(bytes, offset);
      offset = n;
      const chunk = bytes.slice(offset, offset + len);
      offset += len;
      if (fieldNumber === 3) event = decoder.decode(chunk);
      else if (fieldNumber === 4) jsonPayload = decoder.decode(chunk);
      else if (eventTypeId && TYPE_ID_TO_EVENT[eventTypeId]) {
        const schema = EVENT_SCHEMAS[TYPE_ID_TO_EVENT[eventTypeId]];
        const field = schema.fields[fieldNumber - 10];
        if (field?.type === 'string') payload[field.key] = decoder.decode(chunk);
      }
      continue;
    }

    if (wt === wireType.varint) {
      const [v, n] = decodeVarint(bytes, offset);
      offset = n;
      if (eventTypeId && TYPE_ID_TO_EVENT[eventTypeId]) {
        const schema = EVENT_SCHEMAS[TYPE_ID_TO_EVENT[eventTypeId]];
        const field = schema.fields[fieldNumber - 10];
        if (field?.type === 'bool') payload[field.key] = v === 1;
      }
      continue;
    }

    if (wt === wireType.fixed64) {
      const slice = bytes.slice(offset, offset + 8);
      offset += 8;
      if (eventTypeId && TYPE_ID_TO_EVENT[eventTypeId]) {
        const schema = EVENT_SCHEMAS[TYPE_ID_TO_EVENT[eventTypeId]];
        const field = schema.fields[fieldNumber - 10];
        if (field?.type === 'double')
          payload[field.key] = new DataView(slice.buffer, slice.byteOffset, 8).getFloat64(0, true);
      }
    }
  }

  if (eventTypeId && TYPE_ID_TO_EVENT[eventTypeId]) {
    return { event: TYPE_ID_TO_EVENT[eventTypeId], payload };
  }

  return {
    event,
    payload: jsonPayload ? (JSON.parse(jsonPayload) as Record<string, BinaryValue>) : payload,
  };
}

export function estimatePayloadReduction(
  event: string,
  payload: Record<string, BinaryValue>
): { jsonBytes: number; binaryBytes: number; reductionPercent: number } {
  const jsonBytes = encoder.encode(JSON.stringify({ event, payload })).length;
  const binaryBytes = encodeBinaryMessage(event, payload).length;
  const reductionPercent = Number((((jsonBytes - binaryBytes) / jsonBytes) * 100).toFixed(2));
  return { jsonBytes, binaryBytes, reductionPercent };
}
