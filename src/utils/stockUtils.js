const Product = require('../model/productModel');

const updateStock = async (items, increment) => {
  const results = await Promise.all(
    items.map((item) => {
      const quantity = increment ? item.quantity : -item.quantity;

      return Product.findOneAndUpdate(
        {
          _id: item.productId,
          variants: {
            $elemMatch: {
              size: item.selectedSize,
              colors: item.selectedColor,
            },
          },
        },
        {
          $inc: {
            "variants.$.stock": quantity,
          },
        },
        { new: true, runValidators: true }
      );
    })
  );

  const allSucceeded = results.every(r => r !== null);
  if (!allSucceeded) {
    const failedCount = results.filter(r => !r).length;
    console.warn(`[Stock] ${failedCount} product(s) not found during stock update`);
  }

  return allSucceeded;
};

module.exports = { updateStock };