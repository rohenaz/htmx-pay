// new express server using import syntax
import bmap from "bmapjs";
const { TransformTx, supportedProtocols } = bmap;

import { P2PKHAddress, PrivateKey, Transaction, TxIn } from "bsv-wasm";
import express from "express";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { BAP_PREFIX, B_PREFIX, MAP_PREFIX } from "./constants.js";
import { createTransaction, signTransaction } from "./transaction.js";
import { fetchUtxos, getRawTransaction } from "./txo.js";

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

app.post("/transaction/sign", async (req, res) => {
  console.log(req.body);
  const tx = Transaction.from_hex(req.body.transaction);
  const privateKey = PrivateKey.from_wif(
    JSON.parse(req.body.jsonData).sign[0].key
  );
  try {
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

  // decode using https://b.map.sv/tx/<txid>/bmap

  const bmap = await TransformTx(tx.to_hex(), supportedProtocols);

  try {
    res.send(bmap);
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
    default:
      data = [];
  }
  // set text content type
  res.setHeader("Content-Type", "text/plain");
  res.send(`<textarea
    class="border rounded w-full text-sm"
    id="jsonInput"
    name="jsonData"
        rows="10"
      >${JSON.stringify({ pay, sign, data }, null, 2)}</textarea>`);
});

app.post("/transaction/create", async (req, res) => {
  console.log(req.body);
  let { data, pay, sign } = JSON.parse(req.body.jsonData);
  try {
    const tx = createTransaction(data);

    res.send(tx.to_hex());
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
    let u = await fetchUtxos(address.to_string());
    console.log("got utxos: ", utxos);
    if (u && u.length > 0) {
      utxos = u.map((utxo) => ({
        ...utxo,
        selected: false,
      }));
    }

    // const utxoElement = document.querySelector('#utxos');
    const html = u
      .map((utxo) => {
        // this needs to be a checkbox
        return `<div class="flex items-center gap-2"><input type="checkbox" name="utxo" ${
          utxo.selected ? "checked" : ""
        } value="${utxo.tx_hash}:${utxo.tx_pos}">${utxo.tx_hash}:${
          utxo.tx_pos
        } ${utxo.value} sat</div>`;
      })
      .join("");
    res.send(html);
  } catch (e) {
    console.error("Error parsing JSON: ", e);
    res.status(500).send("Error parsing JSON: ", e);
  }
});

app.post("/txo/select", async (req, res) => {
  if (!req.body.utxo) {
    res.status(400).send("No utxo provided");
  }
  if (!req.body.transaction) {
    res.status(400).send("No transaction provided");
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
  let inputs = req.body.utxo;

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
  inputs.forEach((input, index) => {
    let [txid, idx] = input.split(":");

    // find the tx by txid
    let inputTx = inputTxs.find((t) => t.get_id_hex() === txid);
    // find the input by index
    let inputTxOut = inputTx.get_output(parseInt(idx));

    tx.add_input(
      new TxIn(
        Buffer.from(txid, "hex"),
        parseInt(index),
        inputTxOut.get_script_pub_key(),
        Number(inputTxOut.get_satoshis())
      )
    );
  });

  console.log(
    `Constructed transaction with ${tx.get_ninputs()} inputs and ${tx.get_noutputs()} outputs`
  );
  res.send(tx.to_hex());
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
