export function convertToRGBA(rgb: string, alpha: string) {
    const r = parseInt(rgb.substring(1, 3), 16);
    const g = parseInt(rgb.substring(3, 5), 16);
    const b = parseInt(rgb.substring(5, 7), 16);

    return `(${r},${g},${b},${alpha})`;
}
