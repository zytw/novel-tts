const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // 默认错误响应
  let error = { ...err };
  error.message = err.message;

  // Mongoose错误处理
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = {
      message: message.join(', '),
      statusCode: 400
    };
  }

  // JWT错误处理
  if (err.name === 'JsonWebTokenError') {
    error = {
      message: 'Invalid token',
      statusCode: 401
    };
  }

  // JWT过期错误
  if (err.name === 'TokenExpiredError') {
    error = {
      message: 'Token expired',
      statusCode: 401
    };
  }

  // 文件系统错误
  if (err.code === 'ENOENT') {
    error = {
      message: 'File not found',
      statusCode: 404
    };
  }

  // 重复键错误
  if (err.code === '11000') {
    error = {
      message: 'Duplicate field value entered',
      statusCode: 400
    };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = { errorHandler };