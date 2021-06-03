const ethers = require('ethers');
const dotenv = require('dotenv').config();

const addresses = {
  WETH: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
  router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
  recipient: '0x33429DA8a91e853f792C4e07BbB5188F8Cb1F490'
}

//First address of this mnemonic must have enough WETH to pay for tx fess
const privateKey = process.env.PRIVATEKEY;
const provider1 = process.env.PROVIDER;
const mygasPrice = ethers.utils.parseUnits('25', 'gwei');
const provider = new ethers.providers.WebSocketProvider(provider1);;
const wallet = new ethers.Wallet(privateKey);
const account = wallet.connect(provider);
const factory = new ethers.Contract(
    addresses.factory,
    ['event PairCreated(address indexed token0, address indexed token1, address pair, uint)'],
    account
);
const router = new ethers.Contract(
  addresses.router,
  [
    'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
    'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
  ],
  account
);

const weth1 = new ethers.Contract(
    addresses.WETH,
    [
      'function approve(address spender, uint amount) public returns(bool)',
    ],
    account
);
  
  console.log(`Before Approve`);
  const valueToapprove = ethers.utils.parseUnits('0.001', 'ether');
  const init = async () => {
    const tx = await weth1.approve(
      router.address, 
      valueToapprove,
      {
          gasPrice: mygasPrice,
          gasLimit: 210000
      }
    );
    console.log(`After Approve`);
    const receipt = await tx.wait(); 
    console.log('Transaction receipt');
    console.log(receipt);
  } 
  init();

factory.on('PairCreated', async (token0, token1, pairAddress) => {
    console.log(`
      New pair detected
      =================
      token0: ${token0}
      token1: ${token1}
      pairAddress: ${pairAddress}
    `);
  
 
  console.log(`after pairCreated`);

  let tokenIn, tokenOut;

  //what to buy strategy
  if(token0 === addresses.WETH) {
    tokenIn = token0; 
    tokenOut = token1;
  }

  if(token1 == addresses.WETH) {
    tokenIn = token1; 
    tokenOut = token0;
  }

  //The quote currency is not WETH
  if(typeof tokenIn === 'undefined') {
    return;
  }

  const amountIn = ethers.utils.parseUnits('0.001', 'ether');
  const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
  //Our execution price will be a bit different, we need some flexbility
  const amountOutMin = amounts[1].sub(amounts[1].div(30));

  console.log(`
    Buying new token
    =================
    tokenIn: ${amountIn} ${tokenIn} (WETH)
    tokenOut: ${amountOutMin} ${tokenOut}
  `);

  const tx = await router.swapExactTokensForTokens(
    amountIn,
    amountOutMin,
    [tokenIn, tokenOut],
    addresses.recipient,
    Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from the current Unix time
    {
        gasPrice: mygasPrice,
        gasLimit: 210000
    }
  );
  console.log(`line 115`);
  const receipt = await tx.wait(); 
  console.log('Transaction receipt');
  console.log(receipt);
});
