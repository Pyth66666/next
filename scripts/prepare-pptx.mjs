import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

// Serve the pinned browser bundle from our own origin. No CDN or API key needed.
const root=resolve(import.meta.dirname,'..'),target=resolve(root,'public/vendor');
await mkdir(target,{recursive:true});
await copyFile(resolve(root,'node_modules/pptxgenjs/dist/pptxgen.bundle.js'),resolve(target,'pptxgenjs.bundle.js'));
// Preserve the upstream licence alongside the generated dependency asset.
const metadata=JSON.parse(await readFile(resolve(root,'node_modules/pptxgenjs/package.json'),'utf8'));
await writeFile(resolve(target,'pptxgenjs.LICENSE.txt'),`PptxGenJS ${metadata.version}\nMIT License\nCopyright (c) Brent Ely\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.\n`);
console.log('PowerPoint browser export prepared.');
