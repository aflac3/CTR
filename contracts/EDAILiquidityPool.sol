// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title EDAI Liquidity Pool
/// @notice AMM-style liquidity pool for EDAI trading
/// @dev Implements constant product formula for price discovery
contract EDAILiquidityPool is ReentrancyGuard, AccessControl, Pausable {
    bytes32 public constant LIQUIDITY_PROVIDER_ROLE = keccak256("LIQUIDITY_PROVIDER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    struct Pool {
        string edaiId;
        IERC20 edaiToken;
        IERC20 stablecoin;
        uint256 edaiReserve;
        uint256 stablecoinReserve;
        uint256 totalLiquidity;
        bool isActive;
        uint256 lastPrice;
        uint256 lastUpdateTime;
    }

    struct LiquidityPosition {
        address provider;
        string edaiId;
        uint256 edaiAmount;
        uint256 stablecoinAmount;
        uint256 liquidityTokens;
        uint256 timestamp;
        bool isActive;
    }

    // Pool storage
    mapping(string => Pool) public pools;
    mapping(address => LiquidityPosition[]) public providerPositions;
    mapping(string => address[]) public poolProviders;

    // Constants
    uint256 public constant MINIMUM_LIQUIDITY = 1000;
    uint256 public constant FEE_NUMERATOR = 3; // 0.3% fee
    uint256 public constant FEE_DENOMINATOR = 1000;

    // Events
    event PoolCreated(
        string indexed edaiId,
        address indexed edaiToken,
        address indexed stablecoin,
        uint256 initialEdai,
        uint256 initialStablecoin,
        uint256 timestamp
    );

    event LiquidityAdded(
        address indexed provider,
        string indexed edaiId,
        uint256 edaiAmount,
        uint256 stablecoinAmount,
        uint256 liquidityTokens,
        uint256 timestamp
    );

    event LiquidityRemoved(
        address indexed provider,
        string indexed edaiId,
        uint256 edaiAmount,
        uint256 stablecoinAmount,
        uint256 liquidityTokens,
        uint256 timestamp
    );

    event Swap(
        address indexed trader,
        string indexed edaiId,
        bool edaiToStablecoin,
        uint256 inputAmount,
        uint256 outputAmount,
        uint256 fee,
        uint256 timestamp
    );

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
    }

    /// @notice Create a new liquidity pool
    /// @param edaiId The EDAI identifier
    /// @param edaiToken The EDAI token contract
    /// @param stablecoin The stablecoin contract
    /// @param initialEdai Initial EDAI amount
    /// @param initialStablecoin Initial stablecoin amount
    function createPool(
        string memory edaiId,
        address edaiToken,
        address stablecoin,
        uint256 initialEdai,
        uint256 initialStablecoin
    ) external onlyRole(LIQUIDITY_PROVIDER_ROLE) whenNotPaused {
        require(bytes(edaiId).length > 0, "Invalid EDAI ID");
        require(edaiToken != address(0), "Invalid EDAI token");
        require(stablecoin != address(0), "Invalid stablecoin");
        require(initialEdai > 0, "Invalid initial EDAI amount");
        require(initialStablecoin > 0, "Invalid initial stablecoin amount");
        require(!pools[edaiId].isActive, "Pool already exists");

        Pool memory newPool = Pool({
            edaiId: edaiId,
            edaiToken: IERC20(edaiToken),
            stablecoin: IERC20(stablecoin),
            edaiReserve: initialEdai,
            stablecoinReserve: initialStablecoin,
            totalLiquidity: 0,
            isActive: true,
            lastPrice: (initialStablecoin * 1e18) / initialEdai,
            lastUpdateTime: block.timestamp
        });

        pools[edaiId] = newPool;

        // Transfer initial liquidity
        IERC20(edaiToken).transferFrom(msg.sender, address(this), initialEdai);
        IERC20(stablecoin).transferFrom(msg.sender, address(this), initialStablecoin);

        // Calculate initial liquidity tokens
        uint256 liquidityTokens = _calculateLiquidityTokens(initialEdai, initialStablecoin);
        newPool.totalLiquidity = liquidityTokens;

        // Create initial liquidity position
        LiquidityPosition memory position = LiquidityPosition({
            provider: msg.sender,
            edaiId: edaiId,
            edaiAmount: initialEdai,
            stablecoinAmount: initialStablecoin,
            liquidityTokens: liquidityTokens,
            timestamp: block.timestamp,
            isActive: true
        });

        providerPositions[msg.sender].push(position);
        poolProviders[edaiId].push(msg.sender);

        emit PoolCreated(edaiId, edaiToken, stablecoin, initialEdai, initialStablecoin, block.timestamp);
        emit LiquidityAdded(msg.sender, edaiId, initialEdai, initialStablecoin, liquidityTokens, block.timestamp);
    }

    /// @notice Add liquidity to an existing pool
    /// @param edaiId The EDAI identifier
    /// @param edaiAmount Amount of EDAI to add
    /// @param stablecoinAmount Amount of stablecoin to add
    function addLiquidity(
        string memory edaiId,
        uint256 edaiAmount,
        uint256 stablecoinAmount
    ) external onlyRole(LIQUIDITY_PROVIDER_ROLE) nonReentrant whenNotPaused {
        Pool storage pool = pools[edaiId];
        require(pool.isActive, "Pool not active");
        require(edaiAmount > 0, "Invalid EDAI amount");
        require(stablecoinAmount > 0, "Invalid stablecoin amount");

        // Calculate optimal amounts based on current ratio
        (uint256 optimalEdai, uint256 optimalStablecoin) = _calculateOptimalAmounts(
            edaiId,
            edaiAmount,
            stablecoinAmount
        );

        // Transfer tokens
        pool.edaiToken.transferFrom(msg.sender, address(this), optimalEdai);
        pool.stablecoin.transferFrom(msg.sender, address(this), optimalStablecoin);

        // Calculate liquidity tokens
        uint256 liquidityTokens = _calculateLiquidityTokens(optimalEdai, optimalStablecoin);

        // Update pool reserves
        pool.edaiReserve += optimalEdai;
        pool.stablecoinReserve += optimalStablecoin;
        pool.totalLiquidity += liquidityTokens;
        pool.lastPrice = (pool.stablecoinReserve * 1e18) / pool.edaiReserve;
        pool.lastUpdateTime = block.timestamp;

        // Create liquidity position
        LiquidityPosition memory position = LiquidityPosition({
            provider: msg.sender,
            edaiId: edaiId,
            edaiAmount: optimalEdai,
            stablecoinAmount: optimalStablecoin,
            liquidityTokens: liquidityTokens,
            timestamp: block.timestamp,
            isActive: true
        });

        providerPositions[msg.sender].push(position);
        poolProviders[edaiId].push(msg.sender);

        emit LiquidityAdded(msg.sender, edaiId, optimalEdai, optimalStablecoin, liquidityTokens, block.timestamp);
    }

    /// @notice Remove liquidity from a pool
    /// @param edaiId The EDAI identifier
    /// @param liquidityTokens Amount of liquidity tokens to burn
    function removeLiquidity(
        string memory edaiId,
        uint256 liquidityTokens
    ) external onlyRole(LIQUIDITY_PROVIDER_ROLE) nonReentrant whenNotPaused {
        Pool storage pool = pools[edaiId];
        require(pool.isActive, "Pool not active");
        require(liquidityTokens > 0, "Invalid liquidity amount");

        // Find provider's position
        LiquidityPosition[] storage positions = providerPositions[msg.sender];
        uint256 positionIndex = type(uint256).max;
        uint256 totalLiquidity = 0;

        for (uint256 i = 0; i < positions.length; i++) {
            if (keccak256(bytes(positions[i].edaiId)) == keccak256(bytes(edaiId)) && positions[i].isActive) {
                totalLiquidity += positions[i].liquidityTokens;
                if (positionIndex == type(uint256).max) {
                    positionIndex = i;
                }
            }
        }

        require(totalLiquidity >= liquidityTokens, "Insufficient liquidity");

        // Calculate amounts to return
        uint256 edaiAmount = (liquidityTokens * pool.edaiReserve) / pool.totalLiquidity;
        uint256 stablecoinAmount = (liquidityTokens * pool.stablecoinReserve) / pool.totalLiquidity;

        // Update pool reserves
        pool.edaiReserve -= edaiAmount;
        pool.stablecoinReserve -= stablecoinAmount;
        pool.totalLiquidity -= liquidityTokens;
        pool.lastPrice = pool.edaiReserve > 0 ? (pool.stablecoinReserve * 1e18) / pool.edaiReserve : 0;
        pool.lastUpdateTime = block.timestamp;

        // Update position
        positions[positionIndex].liquidityTokens -= liquidityTokens;
        positions[positionIndex].edaiAmount -= edaiAmount;
        positions[positionIndex].stablecoinAmount -= stablecoinAmount;

        if (positions[positionIndex].liquidityTokens == 0) {
            positions[positionIndex].isActive = false;
        }

        // Transfer tokens back to provider
        pool.edaiToken.transfer(msg.sender, edaiAmount);
        pool.stablecoin.transfer(msg.sender, stablecoinAmount);

        emit LiquidityRemoved(msg.sender, edaiId, edaiAmount, stablecoinAmount, liquidityTokens, block.timestamp);
    }

    /// @notice Swap EDAI for stablecoin
    /// @param edaiId The EDAI identifier
    /// @param edaiAmount Amount of EDAI to swap
    /// @param minStablecoinAmount Minimum stablecoin amount to receive
    function swapEdaiForStablecoin(
        string memory edaiId,
        uint256 edaiAmount,
        uint256 minStablecoinAmount
    ) external nonReentrant whenNotPaused {
        Pool storage pool = pools[edaiId];
        require(pool.isActive, "Pool not active");
        require(edaiAmount > 0, "Invalid amount");

        uint256 stablecoinAmount = _calculateSwapOutput(edaiAmount, pool.edaiReserve, pool.stablecoinReserve, true);
        require(stablecoinAmount >= minStablecoinAmount, "Insufficient output amount");

        // Transfer EDAI from trader
        pool.edaiToken.transferFrom(msg.sender, address(this), edaiAmount);

        // Update reserves
        pool.edaiReserve += edaiAmount;
        pool.stablecoinReserve -= stablecoinAmount;
        pool.lastPrice = (pool.stablecoinReserve * 1e18) / pool.edaiReserve;
        pool.lastUpdateTime = block.timestamp;

        // Transfer stablecoin to trader
        pool.stablecoin.transfer(msg.sender, stablecoinAmount);

        uint256 fee = (edaiAmount * FEE_NUMERATOR) / FEE_DENOMINATOR;
        emit Swap(msg.sender, edaiId, true, edaiAmount, stablecoinAmount, fee, block.timestamp);
    }

    /// @notice Swap stablecoin for EDAI
    /// @param edaiId The EDAI identifier
    /// @param stablecoinAmount Amount of stablecoin to swap
    /// @param minEdaiAmount Minimum EDAI amount to receive
    function swapStablecoinForEdai(
        string memory edaiId,
        uint256 stablecoinAmount,
        uint256 minEdaiAmount
    ) external nonReentrant whenNotPaused {
        Pool storage pool = pools[edaiId];
        require(pool.isActive, "Pool not active");
        require(stablecoinAmount > 0, "Invalid amount");

        uint256 edaiAmount = _calculateSwapOutput(stablecoinAmount, pool.stablecoinReserve, pool.edaiReserve, false);
        require(edaiAmount >= minEdaiAmount, "Insufficient output amount");

        // Transfer stablecoin from trader
        pool.stablecoin.transferFrom(msg.sender, address(this), stablecoinAmount);

        // Update reserves
        pool.stablecoinReserve += stablecoinAmount;
        pool.edaiReserve -= edaiAmount;
        pool.lastPrice = (pool.stablecoinReserve * 1e18) / pool.edaiReserve;
        pool.lastUpdateTime = block.timestamp;

        // Transfer EDAI to trader
        pool.edaiToken.transfer(msg.sender, edaiAmount);

        uint256 fee = (stablecoinAmount * FEE_NUMERATOR) / FEE_DENOMINATOR;
        emit Swap(msg.sender, edaiId, false, stablecoinAmount, edaiAmount, fee, block.timestamp);
    }

    /// @notice Get pool information
    /// @param edaiId The EDAI identifier
    /// @return Pool information
    function getPool(string memory edaiId) external view returns (Pool memory) {
        return pools[edaiId];
    }

    /// @notice Get provider's liquidity positions
    /// @param provider The provider address
    /// @return Array of liquidity positions
    function getProviderPositions(address provider) external view returns (LiquidityPosition[] memory) {
        return providerPositions[provider];
    }

    /// @notice Calculate optimal amounts for adding liquidity
    /// @param edaiId The EDAI identifier
    /// @param edaiAmount Desired EDAI amount
    /// @param stablecoinAmount Desired stablecoin amount
    /// @return optimalEdai Optimal EDAI amount
    /// @return optimalStablecoin Optimal stablecoin amount
    function _calculateOptimalAmounts(
        string memory edaiId,
        uint256 edaiAmount,
        uint256 stablecoinAmount
    ) internal view returns (uint256 optimalEdai, uint256 optimalStablecoin) {
        Pool storage pool = pools[edaiId];
        
        if (pool.totalLiquidity == 0) {
            return (edaiAmount, stablecoinAmount);
        }

        uint256 edaiReserve = pool.edaiReserve;
        uint256 stablecoinReserve = pool.stablecoinReserve;

        uint256 optimalStablecoinFromEdai = (edaiAmount * stablecoinReserve) / edaiReserve;
        
        if (optimalStablecoinFromEdai <= stablecoinAmount) {
            optimalEdai = edaiAmount;
            optimalStablecoin = optimalStablecoinFromEdai;
        } else {
            optimalStablecoin = stablecoinAmount;
            optimalEdai = (stablecoinAmount * edaiReserve) / stablecoinReserve;
        }
    }

    /// @notice Calculate liquidity tokens for given amounts
    /// @param edaiAmount EDAI amount
    /// @param stablecoinAmount Stablecoin amount
    /// @return liquidityTokens Amount of liquidity tokens
    function _calculateLiquidityTokens(uint256 edaiAmount, uint256 stablecoinAmount) internal pure returns (uint256) {
        return sqrt(edaiAmount * stablecoinAmount);
    }

    /// @notice Calculate swap output amount
    /// @param inputAmount Input amount
    /// @param inputReserve Input reserve
    /// @param outputReserve Output reserve
    /// @param isEdaiToStablecoin Whether swapping EDAI to stablecoin
    /// @return outputAmount Output amount
    function _calculateSwapOutput(
        uint256 inputAmount,
        uint256 inputReserve,
        uint256 outputReserve,
        bool isEdaiToStablecoin
    ) internal pure returns (uint256) {
        require(inputReserve > 0 && outputReserve > 0, "Insufficient liquidity");

        uint256 inputAmountWithFee = inputAmount * (FEE_DENOMINATOR - FEE_NUMERATOR);
        uint256 numerator = inputAmountWithFee * outputReserve;
        uint256 denominator = (inputReserve * FEE_DENOMINATOR) + inputAmountWithFee;

        return numerator / denominator;
    }

    /// @notice Calculate square root
    /// @param x The number to calculate square root of
    /// @return y The square root
    function sqrt(uint256 x) internal pure returns (uint256 y) {
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
} 