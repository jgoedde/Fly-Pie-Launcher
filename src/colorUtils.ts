export function alpharize(rgb: string, alpha: string) {
    return (
        '(' +
        parseInt(rgb.substring(1, 3), 16) +
        ',' +
        parseInt(rgb.substring(3, 5), 16) +
        ',' +
        parseInt(rgb.substring(5, 7), 16) +
        ',' +
        alpha +
        ')'
    );
}
