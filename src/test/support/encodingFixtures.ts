export type EncodingField = {
  name: string;
  length: number;
  type: string;
};

export type EncodingRow = {
  name: string;
  condition: string;
  fields: EncodingField[];
};

export type EncodingFileType = {
  file_type: string;
  name: string;
  finame_pattern: string;
  encoding?: string;
  length_unit?: "byte" | "utf16";
  rows: EncodingRow[];
};

export type EncodingDefinition = {
  type: "zengin";
  name: string;
  files: EncodingFileType[];
};

export type ByteDefinitionOptions = {
  encoding?: string;
  omitEncoding?: boolean;
  fileType?: string;
  name?: string;
};

export function byteDefinition({
  encoding = "shiftjis",
  omitEncoding = false,
  fileType = "byte_test",
  name = "Shift_JIS",
}: ByteDefinitionOptions = {}): EncodingDefinition {
  return {
    type: "zengin",
    name: "試験",
    files: [
      {
        file_type: fileType,
        name,
        finame_pattern: ".*",
        ...(omitEncoding ? {} : { encoding }),
        length_unit: "byte",
        rows: [
          {
            name: "レコード",
            condition: "^A",
            fields: [
              { name: "ASCII", length: 1, type: "C" },
              { name: "不正境界の前半", length: 1, type: "C" },
              { name: "不正境界の後半", length: 1, type: "C" },
              { name: "末尾", length: 1, type: "C" },
            ],
          },
        ],
      },
    ],
  };
}

export function concurrentByteDefinition(): EncodingDefinition {
  const definitions = [
    byteDefinition(),
    byteDefinition({ encoding: "utf8", fileType: "utf8_test", name: "UTF-8" }),
    byteDefinition({
      omitEncoding: true,
      fileType: "omitted_test",
      name: "省略",
    }),
  ];
  return {
    type: "zengin",
    name: "試験",
    files: definitions.flatMap(({ files }) => files),
  };
}

export function utf16CompatibilityDefinition(): EncodingDefinition {
  const row: EncodingRow = {
    name: "互換レコード",
    condition: "^A",
    fields: [{ name: "ASCII", length: 2, type: "C" }],
  };
  return {
    type: "zengin",
    name: "試験",
    files: [
      {
        file_type: "length_default",
        name: "単位省略",
        finame_pattern: ".*",
        rows: [row],
      },
      {
        file_type: "length_utf16",
        name: "UTF-16明示",
        finame_pattern: ".*",
        length_unit: "utf16",
        rows: [row],
      },
    ],
  };
}
