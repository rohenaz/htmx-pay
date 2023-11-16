import { Script, Transaction, TxOut } from "bsv-wasm";
import { Sigma } from "sigma-protocol";

async function signTransaction({ algo, key, tx }) {
  console.log("signing transaction with data: ", algo, key);
  if (algo === "sigma") {
    
    const sigma = new Sigma(tx, 0, 0, 0);
    
    const { signedTx } = sigma.sign(key);
    
    return signedTx.to_hex();
  } else {
    throw new Error("algo not supported");
  }
}

function createTransaction(d) {
  console.log("creating transaction with data: ", d);
  let data = d;

  // TODO: save the movified pay
  // updatePay();

  try {
    let tx = new Transaction(1, 0);
    // const textEncoder = new TextEncoder(); // Create a new TextEncoder instance

    // // Join the data, encode it, and then convert to a hex string
    // const encodedData = textEncoder.encode(data.join(""));
    // const hexString = Array.from(encodedData, byte => byte.toString(16).padStart(2, '0')).join(" ");

    // now that this is in backend we can just use buffer
    const hexString = Buffer.from(data.join(" ")).toString("hex");

    tx.add_output(new TxOut(BigInt(0), Script.from_asm_string(`OP_0 OP_RETURN ${hexString}`)));
    // console.log("respo: ", tx.to_hex());

    // const txElement = document.querySelector('#transaction');
    // txElement.innerHTML = tx.to_hex();
    return tx;
  } catch (e) {
    console.error("Error creating databutton: ", e);
  }
}

export { createTransaction, signTransaction };
