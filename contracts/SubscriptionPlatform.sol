// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title SubscriptionPlatform - Multi-creator subscription and fund split manager
contract SubscriptionPlatform {
    address public owner;
    uint256 public subscriptionDuration = 30 days;
    uint256 public totalPlatformFees = 0;
    struct Creator {
        uint256 subscriptionFee;
        uint256 platformShare; // % (0–100)
        uint256 creatorBalance;
        uint256 platformBalance;
    }

    mapping(address => Creator) public creators; // creator address => Creator struct
    mapping(address => mapping(address => uint256)) public subscriptions; // user => creator => expiry

    event Subscribed(address indexed user, address indexed creator, uint256 expiresAt);
    event CreatorRegistered(address indexed creator, uint256 fee, uint256 platformShare);
    event Withdrawn(address indexed to, uint256 amount);
    event PlatformWithdrawn(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyCreator(address _creator) {
        require(creators[_creator].subscriptionFee > 0, "Not a registered creator");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Creators can register with a subscription fee and platform share %
    function registerCreator(uint256 fee, uint256 share) external {
        require(share <= 100, "Invalid platform share");
        require(fee > 0, "Fee must be > 0");
        require(creators[msg.sender].subscriptionFee == 0, "Already registered");

        creators[msg.sender] = Creator({
            subscriptionFee: fee,
            platformShare: share,
            creatorBalance: 0,
            platformBalance: 0
        });

        emit CreatorRegistered(msg.sender, fee, share);
    }

    /// @notice User subscribes to a specific creator by paying their fee
    function subscribe(address creator) external payable onlyCreator(creator) {
        Creator storage c = creators[creator];
        require(msg.value == c.subscriptionFee, "Incorrect subscription fee");

        uint256 currentExpiry = subscriptions[msg.sender][creator];
        uint256 newExpiry = currentExpiry > block.timestamp
            ? currentExpiry + subscriptionDuration
            : block.timestamp + subscriptionDuration;

        subscriptions[msg.sender][creator] = newExpiry;

        uint256 platformCut = (msg.value * c.platformShare) / 100;
        uint256 creatorCut = msg.value - platformCut;

        c.creatorBalance += creatorCut;
        c.platformBalance += platformCut;

        totalPlatformFees += platformCut;

        emit Subscribed(msg.sender, creator, newExpiry);
    }

    /// @notice Check if a user is subscribed to a creator
    function isSubscribed(address user, address creator) external view returns (bool) {
        return subscriptions[user][creator] > block.timestamp;
    }

    /// @notice Creator withdraws their own earnings
    function withdrawCreatorEarnings() external {
        Creator storage c = creators[msg.sender];
        uint256 amount = c.creatorBalance;
        require(amount > 0, "No funds");

        c.creatorBalance = 0;
        payable(msg.sender).transfer(amount);

        emit Withdrawn(msg.sender, amount);
    }

     function withdrawPlatformCut() external onlyOwner {
        payable(owner).transfer(totalPlatformFees);
        totalPlatformFees = 0;
       
    }
}
