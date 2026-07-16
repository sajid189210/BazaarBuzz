const truncCurrency = (value) => {
    return Math.trunc(value * 100) / 100;
};

module.exports = { truncCurrency };
