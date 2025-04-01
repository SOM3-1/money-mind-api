const safeAmount = (val) => {
  const num = Number(val);
  console.log(num)
  return isNaN(num) ? 0 : parseFloat(num.toFixed(2));
};

module.exports = { safeAmount };