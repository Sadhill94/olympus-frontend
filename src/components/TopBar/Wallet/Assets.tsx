import { Box, Link, Theme, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { AssetCard, WalletBalance } from "@olympusdao/component-library";
import { BigNumber, BigNumberish } from "ethers";
import { FC } from "react";
import { UseQueryResult } from "react-query";
import { NavLink } from "react-router-dom";
import { formatCurrency, formatNumber, parseBigNumber, prettifySeconds, trim } from "src/helpers";
import { useWeb3Context } from "src/hooks";
import {
  useGohmBalance,
  useOhmBalance,
  useSohmBalance,
  useV1OhmBalance,
  useV1SohmBalance,
  useWsohmBalance,
} from "src/hooks/useBalance";
import { useCurrentIndex } from "src/hooks/useCurrentIndex";
import { useOhmPrice } from "src/hooks/usePrices";
import { useTestableNetworks } from "src/hooks/useTestableNetworks";
import { NetworkId } from "src/networkDetails";
import { useNextRebaseDate } from "src/views/Stake/components/StakeArea/components/RebaseTimer/hooks/useNextRebaseDate";

import { GetTokenPrice } from "./queries";
import { useWallet } from "./Token";

const useStyles = makeStyles<Theme>(theme => ({
  selector: {
    "& p": {
      fontSize: "16px",
      fontWeight: 400,
      fontFamily: "SquareMedium",
      lineHeight: "24px",

      cursor: "pointer",
    },
    "& a": {
      color: theme.colors.gray[90],
      marginRight: "18px",
    },
    "& a:last-child": {
      marginRight: 0,
    },
    "& .active": {
      color: theme.colors.primary[300],
      textDecoration: "inherit",
    },
  },
}));
const DECIMAL_PLACES_SHOWN = 4;

// export interface OHMAssetsProps {}

/**
 * Component for Displaying Assets
 */

const formatBalance = (balance?: BigNumber, units: BigNumberish = 9) =>
  balance && formatNumber(parseBigNumber(balance, units), DECIMAL_PLACES_SHOWN);

const sumBalances = (
  balances: Record<NetworkId.MAINNET | NetworkId.TESTNET_RINKEBY, UseQueryResult<BigNumber, unknown>>,
) => {
  const balArray = Object.entries(balances).map(e => ({ ...e[1], networkId: e[0] }));

  const bal = balArray
    .map(balance => {
      if (balance.data) {
        return parseBigNumber(balance.data);
      }
      return 0;
    })
    .reduce((a, b) => a + b);
  return bal;
};
const Assets: FC = () => {
  const networks = useTestableNetworks();
  const { address: userAddress, networkId, providerInitialized } = useWeb3Context();
  const { data: ohmPrice = 0 } = useOhmPrice();
  const { data: priceFeed = { usd_24h_change: -0 } } = GetTokenPrice();
  const { data: currentIndex = 0 as unknown as BigNumber } = useCurrentIndex();
  const { data: nextRebaseDate } = useNextRebaseDate();
  const { data: ohmBalance = 0 as unknown as BigNumber } = useOhmBalance()[networks.MAINNET];
  const { data: v1OhmBalance = 0 as unknown as BigNumber } = useV1OhmBalance()[networks.MAINNET];
  const { data: v1SohmBalance = 0 as unknown as BigNumber } = useV1SohmBalance()[networks.MAINNET];
  const { data: sOhmBalance = 0 as unknown as BigNumber } = useSohmBalance()[networks.MAINNET];
  const { data: wsOhmBalance = 0 as unknown as BigNumber } = useWsohmBalance()[networks.MAINNET];
  const { data: gOhmBalance = 0 as unknown as BigNumber } = useGohmBalance()[networks.MAINNET];
  const formattedohmBalance = trim(parseBigNumber(ohmBalance), 4);
  const formattedV1OhmBalance = trim(parseBigNumber(v1OhmBalance), 4);
  const formattedV1SohmBalance = trim(parseBigNumber(v1SohmBalance), 4);
  const formattedWsOhmBalance = trim(parseBigNumber(wsOhmBalance), 4);
  const formattedgOhmBalance = trim(parseBigNumber(gOhmBalance, 18), 4);
  const formattedSOhmBalance = trim(parseBigNumber(sOhmBalance), 4);
  const gOhmPriceChange = priceFeed.usd_24h_change * parseBigNumber(currentIndex);
  const gOhmPrice = ohmPrice * parseBigNumber(currentIndex);

  console.log(gOhmPrice, ohmPrice, currentIndex);
  const tokenArray = [
    {
      symbol: ["OHM"],
      balance: formattedohmBalance,
      assetValue: Number(formattedohmBalance) * ohmPrice,
    },
    {
      symbol: ["OHM"],
      balance: formattedV1OhmBalance,
      label: "(v1)",
      assetValue: Number(formattedV1OhmBalance) * ohmPrice,
    },
    {
      symbol: ["sOHM"],
      balance: formattedSOhmBalance,
      timeRemaining:
        nextRebaseDate && `Stakes in ${prettifySeconds((nextRebaseDate.getTime() - new Date().getTime()) / 1000)}`,
      assetValue: Number(formattedSOhmBalance) * ohmPrice,
    },
    {
      symbol: ["sOHM"],
      balance: formattedV1SohmBalance,
      label: "(v1)",
      timeRemaining:
        nextRebaseDate && `Stakes in ${prettifySeconds((nextRebaseDate.getTime() - new Date().getTime()) / 1000)}`,
      assetValue: Number(formattedV1SohmBalance) * ohmPrice,
    },
    {
      symbol: ["wsOHM"],
      balance: formattedWsOhmBalance,
      assetValue: gOhmPrice * Number(formattedWsOhmBalance),
    },
    { symbol: ["gOHM"], balance: formattedgOhmBalance, assetValue: gOhmPrice * Number(formattedgOhmBalance) },
  ];
  const walletTotalValueUSD = Object.values(tokenArray).reduce((totalValue, token) => totalValue + token.assetValue, 0);

  const tokens = useWallet(userAddress, networkId, providerInitialized);
  const alwaysShowTokens = [tokens.ohm, tokens.sohm, tokens.gohm];
  const onlyShowWhenBalanceTokens = [tokens.wsohm, tokens.pool];
  const classes = useStyles();

  return (
    <>
      <WalletBalance
        title="Balance"
        usdBalance={formatCurrency(walletTotalValueUSD, 2)}
        underlyingBalance={`${trim(walletTotalValueUSD / ohmPrice, 2)} OHM`}
      />
      <Box display="flex" flexDirection="row" className={classes.selector} mb="18px" mt="18px">
        <Link exact component={NavLink} to="/assets">
          <Typography>My Wallet</Typography>
        </Link>
        <Link component={NavLink} to="/assets/history">
          <Typography>History</Typography>
        </Link>
      </Box>
      {tokenArray.map(
        (
          token: TokenArray = {
            label: "",
            symbol: undefined,
            assetValue: 0,
          },
        ) => (
          <AssetCard
            token={token.symbol}
            label={token.label}
            assetValue={formatCurrency(token.assetValue, 2)}
            assetBalance={`${token.balance} ${token.symbol}`}
            pnl={formatCurrency(Number(token.balance) == 0 ? 0 : Number(token.balance) * priceFeed.usd_24h_change, 2)}
            timeRemaining={token.timeRemaining}
          />
        ),
      )}
    </>
  );
};

export default Assets;

interface TokenArray {
  assetValue: number;
  symbol: any;
  balance?: string;
  label?: string;
  timeRemaining?: string;
}