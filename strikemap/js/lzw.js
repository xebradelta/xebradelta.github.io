// Dictionary-LZW decoder for the Blitzortung WebSocket stream.
//
// This is the known-good decoder for that feed. It is deliberately not a
// generic LZW implementation — do not swap it for a library.
export function lzwDecode(data) {
  const dict = {};
  const chars = data.split("");
  let currChar = chars[0];
  let oldPhrase = currChar;
  const out = [currChar];
  let code = 256;
  let phrase;
  for (let i = 1; i < chars.length; i++) {
    const currCode = chars[i].charCodeAt(0);
    if (currCode < 256) {
      phrase = chars[i];
    } else {
      phrase = dict[currCode] ? dict[currCode] : oldPhrase + currChar;
    }
    out.push(phrase);
    currChar = phrase.charAt(0);
    dict[code] = oldPhrase + currChar;
    code++;
    oldPhrase = phrase;
  }
  return out.join("");
}
