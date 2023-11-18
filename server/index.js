// new express server using import syntax
import bmap from "bmapjs";
const { TransformTx, supportedProtocols } = bmap;

import { BAP } from "bitcoin-bap";
import {
  ExtendedPrivateKey,
  P2PKHAddress,
  PrivateKey,
  Transaction,
  TxIn,
  TxOut,
} from "bsv-wasm";
import express from "express";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { BAP_PREFIX, B_PREFIX, MAP_PREFIX } from "./constants.js";
import { createTransaction, signTransaction } from "./transaction.js";
import { fetchOrdUtxos, fetchUtxos, getRawTransaction } from "./txo.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// __dirname is not available in ES modules, so we need to derive it
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const port = 2000; // You can choose any port

// Serve static files from your current directory
app.use(express.static(join(__dirname, "../")));

// Serve your main HTML file on the root path
app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "../www/index.html"));
});

// serve fonts
app.get("/fonts/:font", (req, res) => {
  res.sendFile(join(__dirname, "../www/fonts", req.params.font));
});
app.post("/transaction/sign", async (req, res) => {
  console.log(req.body);
  if (!req.body.transaction) {
    res.header("HX-Trigger", "no-transaction");
    res.status(400).send("No transaction provided");
    return;
  }
  try {
    const data = JSON.parse(req.body.jsonData);
    if (!data?.sign?.length) {
      res.header("HX-Trigger", "no-signing-key");
      res.status(400).send("No signing key provided");
      return;
    }
    const tx = Transaction.from_hex(req.body.transaction);
    const privateKey = PrivateKey.from_wif(data.sign[0].key);
    const signedTxHex = await signTransaction({
      algo: "sigma",
      key: privateKey,
      tx,
    });

    res.header("HX-Trigger", "decode");
    res.send(signedTxHex);
  } catch (e) {
    console.error("Error parsing JSON: ", e);
  }
});

app.post("/transaction/decode", async (req, res) => {
  console.log(req.body);
  if (!req.body.transaction) {
    res.status(400).send("No transaction provided");
    return;
  }

  const tx = Transaction.from_hex(req.body.transaction);

  const bmap = await TransformTx(tx.to_hex(), supportedProtocols);

  try {
    res.header("Content-Type", "text/plain");
    res.send(JSON.stringify(bmap, null, 2));
  } catch (e) {
    console.error("Error parsing JSON: ", e);
    res.status(500).send("Error parsing JSON: ", e);
  }
});

// templates replace the data key
app.post("/template/:name", async (req, res) => {
  console.log(req.params, req.body);
  const { name } = req.params;

  let { data, pay, sign } = JSON.parse(req.body.jsonData);

  switch (name) {
    case "bid":
      data = [
        BAP_PREFIX,
        "ID",
        "3SyWUZXvhidNcEHbAC3HkBnKoD2Q",
        "1K4c6YXR1ixNLAqrL8nx5HUQAPKbACTwDo",
      ];
      res.header("HX-Trigger", "template-bid-selected");
      break;
    case "post":
      data = [
        B_PREFIX,
        "my post content here",
        "text/markdown",
        "utf-8",
        "|",
        MAP_PREFIX,
        "SET",
        "app",
        "htmx-pay",
        "type",
        "post",
      ];
      break;
    case "message":
      data = [
        B_PREFIX,
        "my message content here",
        "text/markdown",
        "utf-8",
        "|",
        MAP_PREFIX,
        "SET",
        "app",
        "htmx-pay",
        "type",
        "message",
      ];
      break;
    case "define-func":
      data = [
        MAP_PREFIX,
        "SET",
        "app",
        "htmx-pay",
        "type",
        "func-def",
        "name",
        "myFunction",
        "price",
        "1000",
        "trigger",
        "@myFunction",
      ];

      break;
    case "call-func":
      data = [
        MAP_PREFIX,
        "SET",
        "app",
        "htmx-pay",
        "type",
        "func-call",
        "name",
        "myFunction",
        "trigger",
        "@myFunction",
      ];
      break;
    default:
      data = [];
  }
  // set text content type
  res.setHeader("Content-Type", "text/plain");
  res.send(`<textarea 
  class="w-full bg-transparent text-sm outline-none"
  id="jsonInput"
    name="jsonData"
        rows="16"
      >${JSON.stringify({ pay, sign, data }, null, 2)}</textarea>`);
});

app.post("/bap/generate", async (req, res) => {

  // generate a handom hd key
  const hdPrivateKey = ExtendedPrivateKey.from_random();
  const bap = new BAP(hdPrivateKey.to_string());
  // Create a new identity
  const newId = bap.newId();
  // set the name of the ID
  newId.name = "Frames Jenco";

  // set a description for this ID
  newId.description = "Pseudonymous identity for Jamify and the Jenco bot";

  // set identity attributes
  newId.addAttribute("name", "Frames Jenco");
  newId.addAttribute("email", "frames@jamify.xyz");
  newId.addAttribute("paymail", "framesjenco@relayx.io");

  // export the identities for storage
  const encryptedExport = bap.exportIds();
  // const currentAddress = newId.getCurrentAddress();
  // const idKey = newId.getIdentityKey();
  const newData = newId.getInitialIdTransaction()

  // parse jsonInput 
  let parsedInput = JSON.parse(req.body.jsonData);
  parsedInput.data = newData.map((d, idx) => idx === newData.length - 1 ? `0x${d}` : Buffer.from(d, 'hex').toString());
  // const signingKeys = await newId.getIdSigningKeys()

const signingKey = hdPrivateKey.derive_from_path(newId.currentPath).get_private_key().to_wif()
console.log({signingKey})
  parsedInput.sign = [{ key: signingKey }]
  // 
  // add the id key to the signing keys
  res.header("Content-Type", "text/plain");
  // res.send({
  //   encryptedExport,
  //   rootKey: hdPrivateKey.to_string(),
  //   currentAddress,
  //   idKey: idKey.toString(),
  //   data: newData,
  // });
  
  const keyBackup = `<div hx-swap-oob="beforeend:#bid-backup">Backup your root key offline: ${hdPrivateKey.to_string()}
  <h2>Encrypted Backup File</h2>
  <textarea class="textarea w-full rows="4">${encryptedExport}</textarea></div>`
  res.send(`<pre>${JSON.stringify(parsedInput, null, 2)}</pre>${keyBackup}`);
});

app.post("/transaction/create", async (req, res) => {
  console.log(req.body);
  let data,
    pay,
    sign = {};
  try {
    ({ data, pay, sign } = JSON.parse(req.body.jsonData));
  } catch (e) {
    res.header("HX-Trigger", "bad-data");
    return res.status(400).send();
  }
  try {
    const tx = createTransaction(data);
    res.header("HX-Trigger", "trans");
    return res.send(tx.to_hex());
  } catch (e) {
    console.error("Error parsing JSON: ", e);
  }
});

app.post("/txo/unspent", async (req, res) => {
  console.log("getting utxos: ", req.body);
  let { data, pay, sign } = JSON.parse(req.body.jsonData);

  let utxos = [];
  const address = P2PKHAddress.from_pubkey(
    PrivateKey.from_wif(pay[0].key).to_public_key()
  );

  try {
    let u = (await fetchUtxos(address.to_string())) || [];

    utxos = u.map((utxo) => ({
      ...utxo,
      selected: false,
    }));

    let ords = (await fetchOrdUtxos(address.to_string())) || [];

    ords = ords.map((utxo) => ({
      ...utxo,
      tx_hash: utxo.txid,
      tx_pos: utxo.vout,
      selected: false,
    }));

    console.log("got utxos: ", { utxos, ords });

    // Set response triggers
    let headers = [];
    // transition to utxo section
    if (u.length || ords.length) {
      headers.push("trans-utxo");
    }
    // show ordinals detected modal
    if (ords.length) {
      headers.push("ordinals-found");
    }
    // show no utxos modal
    if (!u.length) {
      headers.push("no-utxos");
    }
    res.header("HX-Trigger", headers.join(", "));

    const html = u
      .concat(ords)
      .map((utxo) => {
        return `<div class="form-control">
                <label class="label cursor-pointer">
                  <span class="label-text text-base-content">${utxo.tx_hash}:${
          utxo.value
        } sat</span> 
                  <input name="utxo" type="checkbox" ${
                    utxo.selected ? "checked" : ""
                  } class="checkbox checkbox-accent" value="${utxo.tx_hash}:${
          utxo.tx_pos
        }:${utxo.value}" />
                </label>
              </div>`;
      })
      .join("");
    res.send(`<div class="grid gap-2">${html}</div>`);
  } catch (e) {
    console.error("Error parsing JSON: ", e);
    res.status(500).send("Error parsing JSON: ", e);
  }
});

app.post("/txo/select", async (req, res) => {
  if (!req.body.utxo) {
    return res.status(400).send("No utxo provided");
  }
  if (!req.body.transaction) {
    return res.status(400).send("No transaction provided");
  }

  let tx = Transaction.from_hex(req.body.transaction);

  // copy the tx without any inputs
  let newTx = new Transaction(tx.version, tx.lock_time);
  // add the outputs
  const numOutputs = tx.get_noutputs();
  for (let i = 0; i < numOutputs; i++) {
    const output = tx.get_output(i);
    newTx.add_output(output);
  }

  tx = newTx;
  let inputs = req.body.utxo || [];

  // if only one input is selected, it will be a string, not an array
  if (req.body.utxo && !Array.isArray(req.body.utxo)) {
    inputs = [req.body.utxo];
  }

  // add the inputs to the tx
  console.log("updating transaction", tx.get_id_hex());
  console.log("adding inputs", inputs);

  let rawTxFetches = inputs.map((input) =>
    getRawTransaction(input.split(":")[0])
  );
  let rawTxs = await Promise.all(rawTxFetches);
  console.log("got raw txs", rawTxs);
  let inputTxs = rawTxs.map((rawTx) => Transaction.from_hex(rawTx));

  // now add the inputs to the tx
  let totalInputValue = 0;
  inputs.forEach((input, index) => {
    let [txid, idx, value] = input.split(":");

    totalInputValue += Number(value);

    // find the tx by txid
    let inputTx = inputTxs.find((t) => t.get_id_hex() === txid);
    // find the input by index
    let inputTxOut = inputTx.get_output(parseInt(idx));

    tx.add_input(
      new TxIn(
        Buffer.from(txid, "hex"),
        parseInt(idx),
        inputTxOut.get_script_pub_key(),
        Number(inputTxOut.get_satoshis())
      )
    );
  });

  // manually calculate fee based on 1 satoshi per byte
  const size = tx.to_hex().length / 2;
  const fee = BigInt(size);
  const totalInput = BigInt(totalInputValue) || tx.satoshis_in() || BigInt(0);
  const totalOutput = tx.satoshis_out() || BigInt(0);
  const change = totalInput - totalOutput - fee;
  console.log("totalInput", Number(change), Number(totalInput));

  // add change output
  if (change > 0) {
    console.log("adding change output", change, req.body.jsonData);
    // get change address from pay key
    const address = P2PKHAddress.from_pubkey(
      PrivateKey.from_wif(
        JSON.parse(req.body.jsonData).pay[0].key
      ).to_public_key()
    );
    console.log("adding change output", change);
    tx.add_output(new TxOut(change, address.get_locking_script()));
  }

  console.log(
    `Constructed transaction with ${tx.get_ninputs()} inputs and ${tx.get_noutputs()} outputs`
  );
  res.header("HX-Trigger", "trans-sign");
  res.send(tx.to_hex());
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
