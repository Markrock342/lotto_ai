import { parseSlipText } from "./src/lib/parse-slip";

const text = `
0186
9832
2607
9722
6448
0223
7601
2905
0863
5009
9862
0709
6077
5699
1606
7984
9963

เชอรี่
(จ่ายแล้ว)✅
`;

const result = parseSlipText(text, 80);
console.log(JSON.stringify(result, null, 2));
