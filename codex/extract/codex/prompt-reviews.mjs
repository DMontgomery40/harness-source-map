// Explicit local source review of uncached build 12246 candidates.
// Decisions are booleans, not Jev confidence. Exact text, source and occurrence must match.
// Static evidence establishes model-facing wording; rollout and live injection remain unverified.
import crypto from "node:crypto";

export const reviewOccurrenceKey = (hash,file,offset) => JSON.stringify([hash,file,offset]);
export function indexPromptReviews(reviews) {
  const indexed = new Map();
  for (const review of reviews) {
    const key = reviewOccurrenceKey(review.hash,review.source_file,review.source_offset);
    if (indexed.has(key)) throw new Error("Duplicate local review for the same source occurrence");
    indexed.set(key,review);
  }
  return indexed;
}

export const promptReviews = indexPromptReviews(
[
  {
    "hash": "bcff48b93fdb57d6",
    "model_facing": true,
    "source_file": ".vite/build/bootstrap-ClH9X4Aa.js",
    "source_offset": 1005997,
    "text_sha256": "afd70ecd083b8e35daa8ac45b47652f97ac59490502c80e4efddb6a21a01d18c",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "b98e50a93ec8cd20",
    "model_facing": true,
    "source_file": ".vite/build/bootstrap-ClH9X4Aa.js",
    "source_offset": 1523932,
    "text_sha256": "1e4f98e788e9de1624bb409c6563a806af2522355d1f99adcecc3ecab56700d3",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "8ce3067c1d5eaa5f",
    "model_facing": false,
    "source_file": ".vite/build/main-DPn4U9E8.js",
    "source_offset": 461777,
    "text_sha256": "046b48a424fa09d541ecff2028ad31c97ffb78389ad29809ce50655728f07738",
    "reason": "SQL catalog statement, not prose instructions."
  },
  {
    "hash": "1deff32f8e8cdbf0",
    "model_facing": false,
    "source_file": "webview/assets/_virtual_settings-search-documents-e57d6206ad62.js",
    "source_offset": 115259,
    "text_sha256": "1deff32f8e8cdbf0f31212dd24b2aa13f623acc1f55e2cd4c29c0f3f823b8bd4",
    "reason": "Human-facing UI, policy notice, onboarding explanation or editor help."
  },
  {
    "hash": "caae31d188cd72bb",
    "model_facing": false,
    "source_file": "webview/assets/announcement-host-10ab79c6155a.js",
    "source_offset": 9732,
    "text_sha256": "caae31d188cd72bb085b15690ad363a81ecb568668e667d62be5ae6c1416ddb0",
    "reason": "Human-facing UI, policy notice, onboarding explanation or editor help."
  },
  {
    "hash": "a9f9f166dde98e44",
    "model_facing": false,
    "source_file": "webview/assets/app-initial-74096abaa6b3.js",
    "source_offset": 7524125,
    "text_sha256": "0805f2c59aba57f691bfe9f2d3894381c01a85c3a8022600f2f9efa6df282770",
    "reason": "Illustrative Page template body, not agent instructions."
  },
  {
    "hash": "1c9d3b0324d1bfa1",
    "model_facing": false,
    "source_file": "webview/assets/app-initial-74096abaa6b3.js",
    "source_offset": 7527283,
    "text_sha256": "0b7f00e5f8174283ad75f0a40e7716f604afea52b036f44678bcf835b4874450",
    "reason": "Illustrative Page template body, not agent instructions."
  },
  {
    "hash": "73cbc42b7c1e7cc4",
    "model_facing": false,
    "source_file": "webview/assets/app-initial-74096abaa6b3.js",
    "source_offset": 7528917,
    "text_sha256": "120e211e982408c158774f845c5f2afdf381672f86c035ca3e0f22c5a75c71f3",
    "reason": "Illustrative Page template body, not agent instructions."
  },
  {
    "hash": "467c56ae7a040c1a",
    "model_facing": false,
    "source_file": "webview/assets/app-initial-74096abaa6b3.js",
    "source_offset": 7529493,
    "text_sha256": "a665300de351e494156a6fe88326962dc85e02d43ba5811e5f7b4da858d11124",
    "reason": "Illustrative Page template body, not agent instructions."
  },
  {
    "hash": "dac39f33c9dfa21f",
    "model_facing": false,
    "source_file": "webview/assets/app-initial-74096abaa6b3.js",
    "source_offset": 7531253,
    "text_sha256": "d697e33c41c3c2c7665077decf5093ac9afbc168849399fce3f2fa7a8381d9ab",
    "reason": "Illustrative Page template body, not agent instructions."
  },
  {
    "hash": "811554ed32cdf8b9",
    "model_facing": false,
    "source_file": "webview/assets/app-initial-74096abaa6b3.js",
    "source_offset": 7532145,
    "text_sha256": "61374f5024b1d2916fa056e48c78150dfa3ceb779aaf9546ac4a044d674d700e",
    "reason": "Illustrative Page template body, not agent instructions."
  },
  {
    "hash": "cd57d8ebf1677284",
    "model_facing": true,
    "source_file": "webview/assets/app-initial-74096abaa6b3.js",
    "source_offset": 7534006,
    "text_sha256": "e7ce64645f327c90cb2cf2ec47c624eda7034d27dfc4315e9f4216b8f6f392fa",
    "reason": "Page template setup request directs model research, writing and preservation behavior."
  },
  {
    "hash": "c540070fffff139e",
    "model_facing": true,
    "source_file": "webview/assets/app-initial-74096abaa6b3.js",
    "source_offset": 7544741,
    "text_sha256": "0f8d8c53f953250dd675f278a28bcf47edf28232ce0e1dde2ef4152180032bc3",
    "reason": "Page template setup request directs model research, writing and preservation behavior."
  },
  {
    "hash": "41a75886f8774b25",
    "model_facing": true,
    "source_file": "webview/assets/app-initial-74096abaa6b3.js",
    "source_offset": 7553323,
    "text_sha256": "b99d873b717a88ac0b892dba084f33fbd917ee2ae4fc0d26c2bb644663366d10",
    "reason": "Page template setup request directs model research, writing and preservation behavior."
  },
  {
    "hash": "090d7fa2a13e4593",
    "model_facing": true,
    "source_file": "webview/assets/app-initial-74096abaa6b3.js",
    "source_offset": 7558685,
    "text_sha256": "2e88cae3ec199b5acf2a5d752f1688842ec0571bc27aecbbc937c7b077e704a7",
    "reason": "Page template setup request directs model research, writing and preservation behavior."
  },
  {
    "hash": "411b6a39b46cd3e3",
    "model_facing": true,
    "source_file": "webview/assets/app-initial-74096abaa6b3.js",
    "source_offset": 7565246,
    "text_sha256": "e75d99d379920d32a6b8e03a103207fabf0d8b6d469c436ba16b94cb47fb3191",
    "reason": "Page template setup request directs model research, writing and preservation behavior."
  },
  {
    "hash": "14c969ad23fd9c88",
    "model_facing": true,
    "source_file": "webview/assets/app-initial-74096abaa6b3.js",
    "source_offset": 7570122,
    "text_sha256": "c4b4133c2ce51bec7a3ae8090164ab68886c56587368e68c03afa1ee2c61d2f8",
    "reason": "Page template setup request directs model research, writing and preservation behavior."
  },
  {
    "hash": "5f3b4d3c977585f6",
    "model_facing": true,
    "source_file": "webview/assets/app-initial-74096abaa6b3.js",
    "source_offset": 7578161,
    "text_sha256": "5f3b4d3c977585f625d2d9144682500fda4e361d4a337779b823d15890b07f2d",
    "reason": "Page template setup request directs model research, writing and preservation behavior."
  },
  {
    "hash": "9439f7fc9221f3aa",
    "model_facing": true,
    "source_file": "webview/assets/app-initial-74096abaa6b3.js",
    "source_offset": 9355988,
    "text_sha256": "9439f7fc9221f3aa8107b989c18696ee1efff02e24a9d63c25f242f641992e76",
    "reason": "Tool schema parameter description supplied to the model."
  },
  {
    "hash": "d0012a5de7b6d0eb",
    "model_facing": true,
    "source_file": "webview/assets/app-initial-74096abaa6b3.js",
    "source_offset": 10010402,
    "text_sha256": "d0012a5de7b6d0eb4ee0288bdc4c0d2c98e61a770877f3faf3d615c01c3e53be",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "414e716c5406ca12",
    "model_facing": true,
    "source_file": "webview/assets/app-primary-92c16ff2fe4e.js",
    "source_offset": 497668,
    "text_sha256": "aa3a539010947048db58bafb12efc7d608988e958f9a19f987a44d809578df25",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "d7b1eee642744587",
    "model_facing": true,
    "source_file": "webview/assets/app-primary-92c16ff2fe4e.js",
    "source_offset": 498574,
    "text_sha256": "ca9e3d511f3a6d02d22f62f2c8288b46ca7930afd70904cea8aa04cf352eefe2",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "124ac4d11165025a",
    "model_facing": true,
    "source_file": "webview/assets/app-primary-92c16ff2fe4e.js",
    "source_offset": 1012518,
    "text_sha256": "124ac4d11165025a542ceb0fdee167c4a3506207bbbdb303fc1ff9b0f2aa0611",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "039e82a13e213f54",
    "model_facing": true,
    "source_file": "webview/assets/app-primary-92c16ff2fe4e.js",
    "source_offset": 1012751,
    "text_sha256": "039e82a13e213f54ad9ce3e2000e2d9c442f68dc0d5bbb03aa8904ebda53819b",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "d29a2e1736a323a5",
    "model_facing": true,
    "source_file": "webview/assets/app-primary-92c16ff2fe4e.js",
    "source_offset": 1237090,
    "text_sha256": "d29a2e1736a323a567f4e9b1efdbeacef7994f3af53a57e6527eca424fa93b50",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "e5fdf8afa48c2b7e",
    "model_facing": true,
    "source_file": "webview/assets/app-primary-92c16ff2fe4e.js",
    "source_offset": 1239186,
    "text_sha256": "0541a0ea84b06bc81a7dd78687fbef45b021f60ef1ef0e5d1575ae4eb624a9ec",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "71fa66ca30ee7cd4",
    "model_facing": true,
    "source_file": "webview/assets/app-shared-5d8e744d1fa1.js",
    "source_offset": 3453091,
    "text_sha256": "58d05bcb642dcdfe1a9f386b484a816cbd1d007358f46756ffa02e9cc8dab792",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "86266e043475b309",
    "model_facing": true,
    "source_file": "webview/assets/artifact-session-binding-28d2d24b7789.js",
    "source_offset": 5255,
    "text_sha256": "86266e043475b3090167c7588698ccebde740c37b0d757b9cb12bfaae1e46382",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "f4d69d3656fe3435",
    "model_facing": true,
    "source_file": "webview/assets/chatgpt-conversation-turn-content-2cdcde8113f5.js",
    "source_offset": 313410,
    "text_sha256": "f4d69d3656fe343585570c978308e86bf0c76a32e79fff889c0b3f040948dd3c",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "10fcadb8c9169aab",
    "model_facing": true,
    "source_file": "webview/assets/companion-context-501fdd070983.js",
    "source_offset": 188,
    "text_sha256": "10fcadb8c9169aab58912f4b4a09371316baaf855ea3d0e9a9551ce6a6950cf4",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "5d4b442ee633fb9c",
    "model_facing": true,
    "source_file": "webview/assets/companion-context-501fdd070983.js",
    "source_offset": 1901,
    "text_sha256": "5d4b442ee633fb9ce2cc0af0a50d99b9a20a57287c0da0fc1b3ad3a34fc8fd59",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "92b4fc14e147dee3",
    "model_facing": true,
    "source_file": "webview/assets/companion-context-501fdd070983.js",
    "source_offset": 2693,
    "text_sha256": "92b4fc14e147dee33c11b46a250902171251654d6f841e2f12d19c8396192278",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "4e3962bad89deb6f",
    "model_facing": true,
    "source_file": "webview/assets/companion-context-501fdd070983.js",
    "source_offset": 3774,
    "text_sha256": "817fc0307b87918b5ab328ba1c776ab0b7d2444aa643bffb6e28b1a360d427da",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "bcb484047ae308d4",
    "model_facing": true,
    "source_file": "webview/assets/companion-context-501fdd070983.js",
    "source_offset": 4931,
    "text_sha256": "7b027be76f4c1f0be7ffa7feab52df070d6acc169d5dde1d44c92e70ddd3e784",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "904049f6e3d11840",
    "model_facing": true,
    "source_file": "webview/assets/companion-context-501fdd070983.js",
    "source_offset": 5741,
    "text_sha256": "e40abd62509e8dfb8c0ebbb003495088b0f80a892d351955dc870dcf1d8b3997",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "694a5cbc6aa4cf2b",
    "model_facing": true,
    "source_file": "webview/assets/companion-context-501fdd070983.js",
    "source_offset": 6046,
    "text_sha256": "20331a9969027cbf42fffb039fa21200eb6f8fb0ac0480f1aef08e32bc4a4efe",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "f1732e73623c8532",
    "model_facing": true,
    "source_file": "webview/assets/configuration-schedule-4d713d896d95.js",
    "source_offset": 28675,
    "text_sha256": "f1732e73623c85327da8da4aa70f5cabf774ad8644653917d8ba23b1509f2512",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "435c45f8244315cd",
    "model_facing": true,
    "source_file": "webview/assets/configuration-schedule-4d713d896d95.js",
    "source_offset": 29181,
    "text_sha256": "3b34db075ecc4f6914d5983af84b10e1cb43e8a74109ce2c893ab1b8c5cc9dd0",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "7cbaff27c8378a27",
    "model_facing": true,
    "source_file": "webview/assets/content-ce6ebd043722.js",
    "source_offset": 42971,
    "text_sha256": "7cbaff27c8378a273591dee6a9cb964d1b935c679a7268fb875566cce97cb178",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "d7eff09e198b5c63",
    "model_facing": true,
    "source_file": "webview/assets/content-ce6ebd043722.js",
    "source_offset": 58456,
    "text_sha256": "d7eff09e198b5c6338f33cf72302a532967de139a2af5802cf4c83ea173ff7b8",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "bd8dd8484bfc8355",
    "model_facing": true,
    "source_file": "webview/assets/content-ce6ebd043722.js",
    "source_offset": 58746,
    "text_sha256": "bd8dd8484bfc83554333447944c4abb05552e4f622870c4743f9612eae922f31",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "c9c16537308d1373",
    "model_facing": true,
    "source_file": "webview/assets/content-ce6ebd043722.js",
    "source_offset": 59265,
    "text_sha256": "c9c16537308d13736a2353eddbda2dda2e37b9719383b1c26e8784cecd3f2d56",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "e7cc5d47456cbe28",
    "model_facing": true,
    "source_file": "webview/assets/content-ce6ebd043722.js",
    "source_offset": 60159,
    "text_sha256": "e7cc5d47456cbe282b45ebaf0079e621ede184e20efc69e3dd15f9bd21afd1d3",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "52197fa63c193b32",
    "model_facing": true,
    "source_file": "webview/assets/content-ce6ebd043722.js",
    "source_offset": 60542,
    "text_sha256": "52197fa63c193b328ef5298e3e5dee2d4bdd551d001484c1ff8cd72cc59c2b61",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "1ae501721291de0a",
    "model_facing": true,
    "source_file": "webview/assets/content-ce6ebd043722.js",
    "source_offset": 60978,
    "text_sha256": "1ae501721291de0a8b24eb4dbffea2e7314da348ca1a995c5c6a7f119f238c41",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "83eeb2576b647ea5",
    "model_facing": true,
    "source_file": "webview/assets/content-ce6ebd043722.js",
    "source_offset": 62004,
    "text_sha256": "83eeb2576b647ea5c6bd74fc1565e31d5f4533a39509c023c3eb797fdb43f09c",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "7aafbf7910513b1e",
    "model_facing": true,
    "source_file": "webview/assets/content-ce6ebd043722.js",
    "source_offset": 62929,
    "text_sha256": "7aafbf7910513b1efa5dc7d814b79076314f4a2295b6e99b0079687fde4617de",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "9b7aa3153008e378",
    "model_facing": true,
    "source_file": "webview/assets/content-ce6ebd043722.js",
    "source_offset": 68240,
    "text_sha256": "5bc986a50494dc4a5a1c1b44a0ec55e4f8306c81adf0ecf64e9f356107a64082",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "38d454aa5610e206",
    "model_facing": true,
    "source_file": "webview/assets/content-ce6ebd043722.js",
    "source_offset": 70913,
    "text_sha256": "38d454aa5610e2065b64f56c5b2eb97c147d9c4b597f6dddb16f2371e7978393",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "9673c9a5c0412da7",
    "model_facing": true,
    "source_file": "webview/assets/content-ce6ebd043722.js",
    "source_offset": 71601,
    "text_sha256": "9673c9a5c0412da77d83f1a4d1b3d0617dbde5a35ae2f7267c852a1018bf91b7",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "a91e6d342790eec7",
    "model_facing": true,
    "source_file": "webview/assets/content-ce6ebd043722.js",
    "source_offset": 73022,
    "text_sha256": "a91e6d342790eec71b19845db39b22b274c9a41f533aae636d591da487379df0",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "43d0458226c35bc5",
    "model_facing": true,
    "source_file": "webview/assets/content-ce6ebd043722.js",
    "source_offset": 73772,
    "text_sha256": "43d0458226c35bc5e0ddf5c3f39126f48e53fd8e1b434d6a5f6e363fc41bc900",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "6d9215a2c30f1371",
    "model_facing": true,
    "source_file": "webview/assets/content-ce6ebd043722.js",
    "source_offset": 74022,
    "text_sha256": "6d9215a2c30f13712fc66fb2cbe4cb267dd4e29fb85be80f206a4c3f11ab5505",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "3c0aff60ac864e87",
    "model_facing": true,
    "source_file": "webview/assets/content-ce6ebd043722.js",
    "source_offset": 74273,
    "text_sha256": "3c0aff60ac864e871f380fcdc35331f5a464b0ce0ba7a41acb453e04fe5cd563",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "8cac3a38f2de5a57",
    "model_facing": true,
    "source_file": "webview/assets/content-ce6ebd043722.js",
    "source_offset": 75469,
    "text_sha256": "8cac3a38f2de5a5755260784190d7167256a5bcb76e772c35e8dded1ab0c7c69",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "041cddc366154590",
    "model_facing": true,
    "source_file": "webview/assets/content-ce6ebd043722.js",
    "source_offset": 291306,
    "text_sha256": "55dbc08fa4fbb7dbfdf7878701ea61929079c2919fe3e4b3f01350bfa0214f21",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "1682781dc23419aa",
    "model_facing": true,
    "source_file": "webview/assets/content-ce6ebd043722.js",
    "source_offset": 292629,
    "text_sha256": "1682781dc23419aa195c3ceca89fdd54257d5cfba55ecff6aa0afc2cfe5ad5a6",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "16e46b56f8b170bc",
    "model_facing": true,
    "source_file": "webview/assets/content-ce6ebd043722.js",
    "source_offset": 323864,
    "text_sha256": "41681c6cab7ee9be00925904dcf2f95bf239ca3706f2a060d35b5b6682b4a592",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "270421bd283df416",
    "model_facing": true,
    "source_file": "webview/assets/content-ce6ebd043722.js",
    "source_offset": 325562,
    "text_sha256": "29284e6c87ca3ccf5c41ad2cf13dbb1dae28ef0f12849f73734c97055e5eb574",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "a8e554272aea8754",
    "model_facing": true,
    "source_file": "webview/assets/content-ce6ebd043722.js",
    "source_offset": 639424,
    "text_sha256": "a8e554272aea8754845727a53e6eca3f3a45c5b7072778b24328fac9c7dba6ed",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "15e43466f6185261",
    "model_facing": true,
    "source_file": "webview/assets/content-ce6ebd043722.js",
    "source_offset": 641819,
    "text_sha256": "15e43466f6185261e883f29d2730ff70bd07ae13bd382d7d4079351e97960066",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "38b42eacda43af29",
    "model_facing": true,
    "source_file": "webview/assets/content-ce6ebd043722.js",
    "source_offset": 802178,
    "text_sha256": "38b42eacda43af29b787a79908806dbfa3cae409f5bc85004d1fb242c7ef3a95",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "54b9b5e1379de2dd",
    "model_facing": false,
    "source_file": "webview/assets/content-ce6ebd043722.js",
    "source_offset": 895595,
    "text_sha256": "0b258439cbf765ea95472e49e391a1ebb21a88c4584ed4901480f6c2fcad394a",
    "reason": "Illustrative Page template body, not agent instructions."
  },
  {
    "hash": "f64a48dfc2ded870",
    "model_facing": true,
    "source_file": "webview/assets/content-ce6ebd043722.js",
    "source_offset": 896063,
    "text_sha256": "f64a48dfc2ded870dfa875019599dfb2ac30a4e9b1262931f2ea289f1b58c32a",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "74b7305cabf12273",
    "model_facing": false,
    "source_file": "webview/assets/content-ce6ebd043722.js",
    "source_offset": 896765,
    "text_sha256": "fb7b3f99792ad915dbd5e83aa0665f159c61bcb4ea7e6b9b315f9f0b36a90e7f",
    "reason": "Illustrative Page template body, not agent instructions."
  },
  {
    "hash": "f945e84c13e83d9c",
    "model_facing": false,
    "source_file": "webview/assets/content-ce6ebd043722.js",
    "source_offset": 897887,
    "text_sha256": "7dc02cc3df9ce3307154a5922e92ff254d9a6b08ed81d7159206d593ae445efc",
    "reason": "Illustrative Page template body, not agent instructions."
  },
  {
    "hash": "bab2c68b9782528b",
    "model_facing": false,
    "source_file": "webview/assets/content-ce6ebd043722.js",
    "source_offset": 898908,
    "text_sha256": "0ae7a01c5b1a7701cc3b570605e27f11a4912720c993115e433aa132ea635cd4",
    "reason": "Illustrative Page template body, not agent instructions."
  },
  {
    "hash": "146ba0e948b457d5",
    "model_facing": true,
    "source_file": "webview/assets/content-ce6ebd043722.js",
    "source_offset": 917333,
    "text_sha256": "146ba0e948b457d5322fceb9140123e16094640eb4be6ed36e5ed261e35b7cc0",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "9c87757a8b22ff93",
    "model_facing": true,
    "source_file": "webview/assets/content-ce6ebd043722.js",
    "source_offset": 917822,
    "text_sha256": "9c87757a8b22ff93f95d2a334a7bca504e6f8d6910304b3954f383f70a61b14f",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "f1115c9b055df909",
    "model_facing": true,
    "source_file": "webview/assets/content-ce6ebd043722.js",
    "source_offset": 918356,
    "text_sha256": "f1115c9b055df9090194ef312f17b6ed1a9eb35c955a763c24151a004675344a",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "9d50a10fb65d363a",
    "model_facing": true,
    "source_file": "webview/assets/content-ce6ebd043722.js",
    "source_offset": 918701,
    "text_sha256": "9d50a10fb65d363a2f6c9001a9a4d090cb64fcfaff934bc87432982ad3b00516",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "dfeda1b78381f449",
    "model_facing": true,
    "source_file": "webview/assets/content-ce6ebd043722.js",
    "source_offset": 919202,
    "text_sha256": "dfeda1b78381f449297a55a8ae9bdb8891e0948e89a841cb29b9909303ae03b8",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "5381c4f04222839e",
    "model_facing": true,
    "source_file": "webview/assets/content-ce6ebd043722.js",
    "source_offset": 919582,
    "text_sha256": "5381c4f04222839ec488f89b35ab3839e058fa965af99ee79054ab2dc0bb3394",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "e7d699f336455b78",
    "model_facing": true,
    "source_file": "webview/assets/context-c125cd2849dd.js",
    "source_offset": 723,
    "text_sha256": "e7d699f336455b78cc4bf804a80dc919fabec8e325e9122c9e7afa5c9a0de255",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "121e5d0f4def5162",
    "model_facing": false,
    "source_file": "webview/assets/create-dialog-aa357211edbd.js",
    "source_offset": 27880,
    "text_sha256": "121e5d0f4def5162e357a50faea9f24594c7688fc3f3269ae290a02a3a09f727",
    "reason": "Human-facing UI, policy notice, onboarding explanation or editor help."
  },
  {
    "hash": "e7895916ec47b3be",
    "model_facing": false,
    "source_file": "webview/assets/data-use-notice-dialog-f2c40bcc9dde.js",
    "source_offset": 1020,
    "text_sha256": "e7895916ec47b3bebf713139120774852f160361756513a32980c75b295ad285",
    "reason": "Human-facing UI, policy notice, onboarding explanation or editor help."
  },
  {
    "hash": "03ebab36c25fe7cb",
    "model_facing": true,
    "source_file": "webview/assets/execution-1990399675c2.js",
    "source_offset": 91283,
    "text_sha256": "03ebab36c25fe7cbc715e212c558c0d5efbbb7170d9e891ee0b39356e8c8b9b3",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "9d970e8201864137",
    "model_facing": false,
    "source_file": "webview/assets/library-item-767426998759.js",
    "source_offset": 1924,
    "text_sha256": "9d970e8201864137fdf84acf6c204af07ce32e31af63a672e7c245125552a348",
    "reason": "Translator note describes UI rendering, not model execution."
  },
  {
    "hash": "6888b9b445a19b95",
    "model_facing": true,
    "source_file": "webview/assets/local-conversation-side-chat-2f0d64fc6b8e.js",
    "source_offset": 14713,
    "text_sha256": "25d53ba23e4df8909976e4802e1f38240208d2db40d1e13c8c08b566679e9625",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "60c85c3387589e50",
    "model_facing": false,
    "source_file": "webview/assets/onboarding-fb71b634ed02.js",
    "source_offset": 29578,
    "text_sha256": "60c85c3387589e504b56fa4baf68b09c4599efd9b3bf17420c91a8fb084f37ef",
    "reason": "Human-facing UI, policy notice, onboarding explanation or editor help."
  },
  {
    "hash": "5c382b840a2e92e5",
    "model_facing": false,
    "source_file": "webview/assets/onboarding-fb71b634ed02.js",
    "source_offset": 30108,
    "text_sha256": "5c382b840a2e92e56c1345f0c615cac2a5664fbd692105e34654fd46deb309b2",
    "reason": "Human-facing UI, policy notice, onboarding explanation or editor help."
  },
  {
    "hash": "c2e0987589f97f33",
    "model_facing": true,
    "source_file": "webview/assets/recommendations-b2d3c66900fd.js",
    "source_offset": 5547,
    "text_sha256": "c2e0987589f97f33cf97ef4ffdb6ca737dae48e334954cb778a02dd8fbb8c893",
    "reason": "Localized user_message sent by the email-monitor example action."
  },
  {
    "hash": "fb24caa21925fd19",
    "model_facing": true,
    "source_file": "webview/assets/review-chat-256d123ad655.js",
    "source_offset": 17770,
    "text_sha256": "fb24caa21925fd194f7f28d48651650139a3c34a8fba66644d18f16e1a8ae537",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "b1928799a1c28e64",
    "model_facing": false,
    "source_file": "webview/assets/state-4dc10ee23436.js",
    "source_offset": 1727,
    "text_sha256": "17b7a2804d3d02df7a04b3808c46b41266f34e9ece71aca65e997fff783616e7",
    "reason": "Human Page tutorial with embedded examples; the whole tutorial is not a model prompt."
  },
  {
    "hash": "b4e61a93f0994880",
    "model_facing": true,
    "source_file": "webview/assets/template-page-creation-e64973709318.js",
    "source_offset": 8150,
    "text_sha256": "b4e61a93f09948800bebda51c60887b89c20e18cf9a73d729b8434b860f80e78",
    "reason": "Addresses model execution, context trust, output format or tool-use boundaries in shipped app code."
  },
  {
    "hash": "98e6fba41a68f36e",
    "model_facing": false,
    "source_file": "webview/assets/update-content-fe61af120e84.js",
    "source_offset": 8353,
    "text_sha256": "98e6fba41a68f36eea72d13886cb2f25232fb19200b3e64386fc08bf9d34f748",
    "reason": "Translator note describes UI rendering, not model execution."
  },
  {
    "hash": "c530d4b0adb9c757",
    "model_facing": false,
    "source_file": "webview/assets/url-dc8ad7d25f52.js",
    "source_offset": 22199,
    "text_sha256": "c530d4b0adb9c75732cfd728c9d7573981e5c03c85f54153bb8d7731756e495b",
    "reason": "Human-facing UI, policy notice, onboarding explanation or editor help."
  }
]);

export function localReviewFor(candidate, reviews = promptReviews) {
  const review = reviews.get(reviewOccurrenceKey(candidate.hash,candidate.file,candidate.offset));
  if (!review || typeof review.model_facing !== "boolean" || review.source_file !== candidate.file ||
      !Number.isSafeInteger(candidate.offset) || candidate.offset < 0 || review.source_offset !== candidate.offset ||
      review.text_sha256 !== crypto.createHash("sha256").update(candidate.text).digest("hex")) return null;
  return review;
}

export function candidateDecision(candidate, p = null, reviews = promptReviews) {
  const review = localReviewFor(candidate, reviews);
  return { p, origin: review ? "local-source-review" : p == null ? "unknown" : "jev",
    model_facing: review?.model_facing ?? null, review };
}

export const publishDecision = (decision, threshold = 0.8) => decision.origin === "local-source-review"
  ? decision.model_facing === true : decision.p != null && decision.p >= threshold;
