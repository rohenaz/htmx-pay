const fetchUtxos = async (address) => {
  console.log("Fetching utxos for", address);
  // https://junglebus.gorillapool.io/v1/address/get/1C1ywwV32Xe9xoYAMKT1fe4xPs8JGBgVPR
  const resp = await fetch(
    `https://api.whatsonchain.com/v1/bsv/main/address/${address}/unspent`
    );
    return await resp.json();
  };
  
  const fetchOrdUtxos = async (address) => {
  // /api/txos/address/{address}/unspent
  const respOrd = await fetch(
    `https://v3.ordinals.gorillapool.io/api/txos/address/${address}/unspent`
  );
  return await respOrd.json();
};

const getRawTransaction = async (txid) => {
  console.log("Fetching raw transaction for", txid);
  const resp = await fetch(
    `https://api.whatsonchain.com/v1/bsv/main/tx/${txid}/hex`
  );
  return await resp.text();
};

export { fetchOrdUtxos, fetchUtxos, getRawTransaction };

