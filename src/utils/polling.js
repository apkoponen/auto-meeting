function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function poll(callback, delayInMs) {
  const result = await callback();
  if (result) {
    return result;
  } else {
    await sleep(delayInMs);
    return poll(callback, delayInMs);
  }
}

module.exports = { poll };
