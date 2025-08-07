// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/// @title EDAI Fallback Engine
/// @notice Executes fallback actions when EDAI breaches occur
/// @dev Implements automated fallback execution for enforcement actions
contract EDAIFallbackEngine is ReentrancyGuard, AccessControl, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    struct FallbackAction {
        string actionId;
        string edaiId;
        FallbackType actionType;
        uint256 amount;
        address target;
        bytes data;
        uint256 timestamp;
        bool executed;
        string result;
    }

    struct FallbackConfig {
        uint256 partialFallbackThreshold;
        uint256 fullFallbackThreshold;
        uint256 emergencyThreshold;
        uint256 executionDelay;
        bool autoExecution;
    }

    enum FallbackType {
        NONE,
        PARTIAL_FALLBACK,
        FULL_FALLBACK,
        EMERGENCY_FALLBACK,
        LIQUIDATION,
        INSURANCE_CLAIM
    }

    // Storage
    mapping(string => FallbackAction) public fallbackActions;
    mapping(string => FallbackConfig) public fallbackConfigs;
    mapping(address => string[]) public executorActions;
    mapping(string => uint256) public actionCount;
    mapping(bytes32 => bool) public executedActions;

    // Events
    event FallbackActionCreated(
        string indexed actionId,
        string indexed edaiId,
        FallbackType actionType,
        uint256 amount,
        address indexed target,
        uint256 timestamp
    );

    event FallbackActionExecuted(
        string indexed actionId,
        string indexed edaiId,
        FallbackType actionType,
        bool success,
        string result,
        uint256 timestamp
    );

    event FallbackConfigUpdated(
        string indexed edaiId,
        uint256 partialThreshold,
        uint256 fullThreshold,
        uint256 emergencyThreshold,
        uint256 executionDelay,
        bool autoExecution
    );

    event EmergencyFallbackTriggered(
        string indexed edaiId,
        FallbackType actionType,
        address indexed executor,
        uint256 timestamp
    );

    // Constants
    uint256 public constant MAX_EXECUTION_DELAY = 24 hours;
    uint256 public constant MIN_FALLBACK_AMOUNT = 1e18; // 1 token minimum
    uint256 public constant MAX_FALLBACK_AMOUNT = 1000000e18; // 1M tokens maximum

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(EXECUTOR_ROLE, msg.sender);
        _grantRole(EMERGENCY_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
    }

    /// @notice Create a fallback action
    /// @param actionId Unique action identifier
    /// @param edaiId EDAI identifier
    /// @param actionType Type of fallback action
    /// @param amount Amount for the action
    /// @param target Target address
    /// @param data Additional data
    function createFallbackAction(
        string memory actionId,
        string memory edaiId,
        FallbackType actionType,
        uint256 amount,
        address target,
        bytes memory data
    ) external onlyRole(EXECUTOR_ROLE) whenNotPaused {
        require(bytes(actionId).length > 0, "Invalid action ID");
        require(bytes(edaiId).length > 0, "Invalid EDAI ID");
        require(actionType != FallbackType.NONE, "Invalid action type");
        require(amount >= MIN_FALLBACK_AMOUNT, "Amount too low");
        require(amount <= MAX_FALLBACK_AMOUNT, "Amount too high");
        require(target != address(0), "Invalid target address");
        require(fallbackActions[actionId].timestamp == 0, "Action already exists");

        FallbackAction storage action = fallbackActions[actionId];
        action.actionId = actionId;
        action.edaiId = edaiId;
        action.actionType = actionType;
        action.amount = amount;
        action.target = target;
        action.data = data;
        action.timestamp = block.timestamp;
        action.executed = false;
        action.result = "";

        executorActions[msg.sender].push(actionId);
        actionCount[edaiId]++;

        emit FallbackActionCreated(actionId, edaiId, actionType, amount, target, block.timestamp);
    }

    /// @notice Execute a fallback action
    /// @param actionId The action identifier
    function executeFallbackAction(string memory actionId) external onlyRole(EXECUTOR_ROLE) whenNotPaused {
        require(bytes(actionId).length > 0, "Invalid action ID");
        
        FallbackAction storage action = fallbackActions[actionId];
        require(action.timestamp != 0, "Action not found");
        require(!action.executed, "Action already executed");

        // Check execution delay
        FallbackConfig storage config = fallbackConfigs[action.edaiId];
        if (config.executionDelay > 0) {
            require(block.timestamp >= action.timestamp + config.executionDelay, "Execution delay not met");
        }

        bool success = false;
        string memory result = "";

        try this._executeAction(action) {
            success = true;
            result = "Success";
        } catch Error(string memory reason) {
            success = false;
            result = reason;
        } catch {
            success = false;
            result = "Unknown error";
        }

        action.executed = true;
        action.result = result;
        executedActions[keccak256(abi.encodePacked(actionId))] = true;

        emit FallbackActionExecuted(actionId, action.edaiId, action.actionType, success, result, block.timestamp);
    }

    /// @notice Execute emergency fallback
    /// @param edaiId EDAI identifier
    /// @param actionType Emergency action type
    /// @param amount Amount for the action
    /// @param target Target address
    function executeEmergencyFallback(
        string memory edaiId,
        FallbackType actionType,
        uint256 amount,
        address target
    ) external onlyRole(EMERGENCY_ROLE) whenNotPaused {
        require(bytes(edaiId).length > 0, "Invalid EDAI ID");
        require(actionType == FallbackType.EMERGENCY_FALLBACK || actionType == FallbackType.LIQUIDATION, "Invalid emergency action");
        require(amount > 0, "Invalid amount");
        require(target != address(0), "Invalid target address");

        string memory actionId = string(abi.encodePacked("EMERGENCY_", edaiId, "_", Strings.toString(block.timestamp)));
        
        _createFallbackActionInternal(actionId, edaiId, actionType, amount, target, "");
        _executeFallbackActionInternal(actionId);

        emit EmergencyFallbackTriggered(edaiId, actionType, msg.sender, block.timestamp);
    }

    /// @notice Update fallback configuration
    /// @param edaiId EDAI identifier
    /// @param partialThreshold Partial fallback threshold
    /// @param fullThreshold Full fallback threshold
    /// @param emergencyThreshold Emergency threshold
    /// @param executionDelay Execution delay
    /// @param autoExecution Auto execution flag
    function updateFallbackConfig(
        string memory edaiId,
        uint256 partialThreshold,
        uint256 fullThreshold,
        uint256 emergencyThreshold,
        uint256 executionDelay,
        bool autoExecution
    ) external onlyRole(OPERATOR_ROLE) {
        require(bytes(edaiId).length > 0, "Invalid EDAI ID");
        require(executionDelay <= MAX_EXECUTION_DELAY, "Execution delay too high");

        FallbackConfig storage config = fallbackConfigs[edaiId];
        config.partialFallbackThreshold = partialThreshold;
        config.fullFallbackThreshold = fullThreshold;
        config.emergencyThreshold = emergencyThreshold;
        config.executionDelay = executionDelay;
        config.autoExecution = autoExecution;

        emit FallbackConfigUpdated(edaiId, partialThreshold, fullThreshold, emergencyThreshold, executionDelay, autoExecution);
    }

    /// @notice Get fallback action details
    /// @param actionId The action identifier
    /// @return Action details
    function getFallbackAction(string memory actionId) external view returns (FallbackAction memory) {
        return fallbackActions[actionId];
    }

    /// @notice Get fallback configuration
    /// @param edaiId The EDAI identifier
    /// @return Configuration details
    function getFallbackConfig(string memory edaiId) external view returns (FallbackConfig memory) {
        return fallbackConfigs[edaiId];
    }

    /// @notice Get all actions for an executor
    /// @param executor The executor address
    /// @return Array of action IDs
    function getExecutorActions(address executor) external view returns (string[] memory) {
        return executorActions[executor];
    }

    /// @notice Check if action is executed
    /// @param actionId The action identifier
    /// @return Whether the action is executed
    function isActionExecuted(string memory actionId) external view returns (bool) {
        return fallbackActions[actionId].executed;
    }

    /// @notice Get action count for an EDAI
    /// @param edaiId The EDAI identifier
    /// @return Number of actions
    function getActionCount(string memory edaiId) external view returns (uint256) {
        return actionCount[edaiId];
    }

    /// @notice Internal function to execute an action
    /// @param action The action to execute
    function _executeAction(FallbackAction memory action) external pure {
        // This is a placeholder for actual execution logic
        // In a real implementation, this would:
        // 1. Transfer tokens if needed
        // 2. Call external contracts
        // 3. Update state
        // 4. Emit events
        
        require(action.amount > 0, "Invalid amount");
        require(action.target != address(0), "Invalid target");
        
        // Simulate execution success
        if (action.actionType == FallbackType.NONE) {
            revert("Invalid action type");
        }
    }

    /// @notice Internal function to create a fallback action
    /// @param actionId Unique action identifier
    /// @param edaiId EDAI identifier
    /// @param actionType Type of fallback action
    /// @param amount Amount for the action
    /// @param target Target address
    /// @param data Additional data
    function _createFallbackActionInternal(
        string memory actionId,
        string memory edaiId,
        FallbackType actionType,
        uint256 amount,
        address target,
        bytes memory data
    ) internal {
        require(bytes(actionId).length > 0, "Invalid action ID");
        require(bytes(edaiId).length > 0, "Invalid EDAI ID");
        require(actionType != FallbackType.NONE, "Invalid action type");
        require(amount >= MIN_FALLBACK_AMOUNT, "Amount too low");
        require(amount <= MAX_FALLBACK_AMOUNT, "Amount too high");
        require(target != address(0), "Invalid target address");
        require(fallbackActions[actionId].timestamp == 0, "Action already exists");

        FallbackAction storage action = fallbackActions[actionId];
        action.actionId = actionId;
        action.edaiId = edaiId;
        action.actionType = actionType;
        action.amount = amount;
        action.target = target;
        action.data = data;
        action.timestamp = block.timestamp;
        action.executed = false;
        action.result = "";

        executorActions[msg.sender].push(actionId);
        actionCount[edaiId]++;

        emit FallbackActionCreated(actionId, edaiId, actionType, amount, target, block.timestamp);
    }

    /// @notice Internal function to execute a fallback action
    /// @param actionId The action identifier
    function _executeFallbackActionInternal(string memory actionId) internal {
        require(bytes(actionId).length > 0, "Invalid action ID");
        
        FallbackAction storage action = fallbackActions[actionId];
        require(action.timestamp != 0, "Action not found");
        require(!action.executed, "Action already executed");

        // Check execution delay
        FallbackConfig storage config = fallbackConfigs[action.edaiId];
        if (config.executionDelay > 0) {
            require(block.timestamp >= action.timestamp + config.executionDelay, "Execution delay not met");
        }

        bool success = false;
        string memory result = "";

        try this._executeAction(action) {
            success = true;
            result = "Success";
        } catch Error(string memory reason) {
            success = false;
            result = reason;
        } catch {
            success = false;
            result = "Unknown error";
        }

        action.executed = true;
        action.result = result;
        executedActions[keccak256(abi.encodePacked(actionId))] = true;

        emit FallbackActionExecuted(actionId, action.edaiId, action.actionType, success, result, block.timestamp);
    }

    /// @notice Batch execute multiple actions
    /// @param actionIds Array of action identifiers
    function batchExecuteActions(string[] memory actionIds) external onlyRole(EXECUTOR_ROLE) whenNotPaused {
        require(actionIds.length <= 20, "Batch too large");

        for (uint256 i = 0; i < actionIds.length; i++) {
            if (!fallbackActions[actionIds[i]].executed) {
                _executeFallbackActionInternal(actionIds[i]);
            }
        }
    }

    /// @notice Check if emergency conditions are met
    /// @param edaiId The EDAI identifier
    /// @param severity The breach severity
    /// @return Whether emergency conditions are met
    function checkEmergencyConditions(string memory edaiId, uint256 severity) external view returns (bool) {
        FallbackConfig storage config = fallbackConfigs[edaiId];
        return severity >= config.emergencyThreshold;
    }
} 