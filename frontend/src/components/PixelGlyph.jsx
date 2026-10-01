// Glyphe pixel façon lusion.co/about : initiale du titre en police bitmap 3x5.
const FONT = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
    E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
    I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
    M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
    Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
    U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
    Y: '101101010010010', Z: '111001010100111', 0: '111101101101111', 1: '010110010010111',
    2: '110001010100111', 3: '110001010001110', 4: '101101111001001', 5: '111100110001110',
    6: '011100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001110',
};

export const glyphFor = (text) => {
    const ch = (text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().match(/[A-Z0-9]/);
    return ch ? ch[0] : 'L';
};

const PixelGlyph = ({ char = 'L', className = '' }) => {
    const bits = FONT[char] || FONT.L;
    return (
        <svg viewBox="0 0 3 5" className={className} shapeRendering="crispEdges" aria-hidden="true" fill="currentColor">
            {[...bits].map((b, i) => b === '1'
                ? <rect key={i} x={i % 3} y={Math.floor(i / 3)} width="1.02" height="1.02" />
                : null)}
        </svg>
    );
};

export default PixelGlyph;
