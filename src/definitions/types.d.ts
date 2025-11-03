export type RowDefinition = {
    name: string;
    condition: RegExp;
    mode_rule?: RegExp;
    mode_rule_position?: number;
    mode?: RegExp;
    columns: number[];
};

export type FilePattern = {
    finame_pattern: RegExp;
    file_type: string;
    name: string;
};