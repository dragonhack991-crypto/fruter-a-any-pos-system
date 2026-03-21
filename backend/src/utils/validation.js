import { body, param, query, validationResult } from 'express-validator';

// Middleware para manejar errores de validación
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Errores de validación',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// VALIDACIONES DE PRODUCTOS
export const validateProduct = [
  body('name')
    .trim()
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({ min: 3 }).withMessage('El nombre debe tener al menos 3 caracteres'),
  body('category_id')
    .isInt().withMessage('category_id debe ser un número'),
  body('unit_id')
    .isInt().withMessage('unit_id debe ser un número'),
  body('unit_price')
    .isFloat({ min: 0 }).withMessage('El precio debe ser un número positivo'),
  body('barcode')
    .optional()
    .trim()
    .custom(async (value) => {
      // Validar que no sea duplicado (se hace en controller)
      return true;
    }),
  body('description').optional().trim(),
  body('is_perishable').optional().isBoolean(),
  body('shelf_life_days').optional().isInt({ min: 0 })
];

export const validateProductUpdate = [
  param('id').isInt().withMessage('ID debe ser un número'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3 }).withMessage('El nombre debe tener al menos 3 caracteres'),
  body('unit_price')
    .optional()
    .isFloat({ min: 0 }).withMessage('El precio debe ser un número positivo'),
  body('barcode').optional().trim(),
  body('description').optional().trim()
];

export const validateProductId = [
  param('id').isInt().withMessage('ID debe ser un número entero')
];

// VALIDACIONES DE VENTAS
export const validateSale = [
  body('items')
    .isArray({ min: 1 }).withMessage('Debe tener al menos un item'),
  body('items.*.product_id')
    .isInt().withMessage('product_id debe ser un número'),
  body('items.*.quantity')
    .isInt({ min: 1 }).withMessage('La cantidad debe ser mayor a 0'),
  body('items.*.unit_price')
    .isFloat({ min: 0 }).withMessage('El precio debe ser válido'),
  body('subtotal')
    .isFloat({ min: 0 }).withMessage('Subtotal debe ser un número positivo'),
  body('tax')
    .isFloat({ min: 0 }).withMessage('Tax debe ser un número'),
  body('discount')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('Descuento debe estar entre 0-100'),
  body('total_amount')
    .isFloat({ min: 0 }).withMessage('Total debe ser un número positivo'),
  body('payment_method')
    .isIn(['cash', 'card', 'check', 'transfer']).withMessage('Método de pago inválido'),
  body('notes').optional().trim()
];

// VALIDACIONES DE COMPRAS
export const validatePurchase = [
  body('supplier_id')
    .isInt().withMessage('supplier_id debe ser un número'),
  body('purchase_date')
    .isISO8601().withMessage('Formato de fecha inválido'),
  body('items')
    .isArray({ min: 1 }).withMessage('Debe tener al menos un item'),
  body('items.*.product_id')
    .isInt().withMessage('product_id debe ser un número'),
  body('items.*.quantity')
    .isInt({ min: 1 }).withMessage('La cantidad debe ser mayor a 0'),
  body('items.*.unit_cost')
    .isFloat({ min: 0 }).withMessage('El costo debe ser válido'),
  body('notes').optional().trim()
];

// VALIDACIONES DE USUARIOS
export const validateUser = [
  body('email')
    .isEmail().withMessage('Email inválido')
    .normalizeEmail(),
  body('full_name')
    .trim()
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({ min: 3 }).withMessage('El nombre debe tener al menos 3 caracteres'),
  body('password')
    .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('La contraseña debe contener mayúscula, minúscula y número'),
  body('role')
    .isIn([1, 2, 3]).withMessage('Rol inválido (1=admin, 2=manager, 3=cashier)')
];

// VALIDACIONES DE PROVEEDORES
export const validateSupplier = [
  body('name')
    .trim()
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({ min: 3 }).withMessage('El nombre debe tener al menos 3 caracteres'),
  body('contact_person').optional().trim(),
  body('email')
    .optional()
    .isEmail().withMessage('Email inválido'),
  body('phone').optional().trim(),
  body('address').optional().trim()
];

// VALIDACIONES DE PAGINACIÓN
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('page debe ser mayor a 0'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit debe estar entre 1-100'),
  query('sort')
    .optional()
    .matches(/^(-?)[\w]+$/).withMessage('Parámetro sort inválido')
];
// Agregar estas líneas al archivo validation.js existente

export const validateSetting = [
  body('storeName')
    .optional()
    .trim()
    .isLength({ min: 2 }).withMessage('El nombre de la tienda debe tener al menos 2 caracteres'),
  body('tax_rate')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('El IVA debe estar entre 0-100'),
  body('currency')
    .optional()
    .isIn(['USD', 'CRC', 'EUR', 'MXN', 'COP']).withMessage('Moneda no válida'),
  body('language')
    .optional()
    .isIn(['es', 'en', 'pt']).withMessage('Idioma no válido'),
  body('theme')
    .optional()
    .isIn(['light', 'dark', 'auto']).withMessage('Tema no válido')
];

export const validatePasswordChange = [
  body('currentPassword')
    .notEmpty().withMessage('Contraseña actual requerida'),
  body('newPassword')
    .isLength({ min: 6 }).withMessage('Nueva contraseña debe tener al menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe contener mayúscula, minúscula y número'),
  body('confirmPassword')
    .notEmpty().withMessage('Confirmación requerida')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Las contraseñas no coinciden')
];