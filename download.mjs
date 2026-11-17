const interactive = process.stdout.isTTY && process.env.TERM !== 'dumb';
const accent = text => interactive
  ? `\x1b[1;36m${text}\x1b[0m`
  : text;

function progress(done) {
  if (!interactive) return;
  const bar = '█'.repeat(done) + '░'.repeat(10 - done);
  const label = done === 10 ? 'Готово' : `Запрос ${done + 1}/10`;
  const line = `${bar}  ${label}`;
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
  process.stdout.write(accent(line.slice(0, Math.max(1, process.stdout.columns - 1))));
}

async function main() {
  const [address] = process.argv.slice(2);
  if (process.argv.length !== 3 || !/^https?:\/\//i.test(address)) {
    throw new Error('Укажите адрес: node download.mjs "https://example.org/file"');
  }

  const url = new URL(address);
  let totalBytes = 0;
  let elapsedMs = 0;

  console.log(accent('ЗАМЕР СКОРОСТИ') + '  ·  ' + url.host);
  for (let i = 0; i < 10; i++) {
    progress(i);
    const start = performance.now();
    const response = await fetch(url, {
      headers: { 'Accept-Encoding': 'identity' },
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error('HTTP ' + response.status);
    }
    if (response.body) {
      for await (const chunk of response.body) {
        totalBytes += chunk.byteLength;
      }
    }
    elapsedMs += performance.now() - start;
  }

  progress(10);
  if (interactive) console.log();
  console.log();
  const seconds = elapsedMs / 1000;
  console.log('Среднее время запроса:', (seconds / 10).toFixed(3), 'с');
  console.log('Скачано за 10 запросов:', totalBytes, 'байт');
  console.log(accent('Скорость скачивания: ' + (totalBytes / 1048576 / seconds).toFixed(3) + ' МиБ/с'));
}

main().catch(error => {
  if (interactive) console.log();
  console.error("Ошибка: " + error.message);
  process.exitCode = 1;
});

