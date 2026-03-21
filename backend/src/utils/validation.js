import { body, query, validationResult } from 'express-validator';

// ============ MIDDLEWARE DE VALIDACIÓN ============

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Errores de validación',
      details: errors.array()
    });
  }
  next();
};

// ============ VALIDACIONES DE PRODUCTOS ============

export const validateProduct = [
  body('name')
    .trim()
    .notEmpty().withMessage('Nombre es requerido')
    .isLength({ min: 3 }).withMessage('Nombre debe tener al menos 3 caracteres'),
  body('category_id')
    .isInt({ min: 1 }).withMessage('category_id debe ser un número válido'),
  body('unit_id')
    .isInt({ min: 1 }).withMessage('unit_id debe ser un número válido'),
  body('unit_price')
    .isFloat({ min: 0 }).withMessage('unit_price debe ser un número positivo'),
  body('barcode')
    .optional()
    .trim(),
  body('is_perishable')
    .optional()
    .isBoolean().withMessage('is_perishable debe ser boolean'),
  body('shelf_life_days')
    .optional()
    .isInt({ min: 0 }).withMessage('shelf_life_days debe ser un número positivo')
];

// ============ VALIDACIONES DE IMPUESTOS ============

export const validateProductTaxes = [
  body('is_iva')
    .optional()
    .isBoolean().withMessage('is_iva debe ser boolean'),
  body('is_ieps')
    .optional()
    .isBoolean().withMessage('is_ieps debe ser boolean'),
  body('ieps_rate')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('IEPS rate debe estar entre 0-100')
];

export const validateTaxSettings = [
  body('iva_rate')
    .isFloat({ min: 0, max: 100 }).withMessage('IVA debe estar entre 0-100'),
  body('ieps_rate')
    .isFloat({ min: 0, max: 100 }).withMessage('IEPS debe estar entre 0-100'),
  body('apply_iva_by_default')
    .isBoolean().withMessage('apply_iva_by_default debe ser boolean'),
  body('apply_ieps_by_default')
    .isBoolean().withMessage('apply_ieps_by_default debe ser boolean')
];

// ============ VALIDACIONES DE VENTAS ============

export const validateSale = [
  body('items')
    .isArray({ min: 1 }).withMessage('items debe ser un array con al menos 1 elemento'),
  body('items.*.product_id')
    .isInt({ min: 1 }).withMessage('product_id debe ser un número válido'),
  body('items.*.quantity')
    .isFloat({ min: 0.01 }).withMessage('quantity debe ser mayor a 0'),
  body('items.*.unit_price')
    .isFloat({ min: 0 }).withMessage('unit_price debe ser un número positivo'),
  body('subtotal')
    .isFloat({ min: 0 }).withMessage('subtotal debe ser un número positivo'),
  body('discount')
    .optional()
    .isFloat({ min: 0 }).withMessage('discount debe ser un número positivo'),
  body('total_amount')
    .isFloat({ min: 0 }).withMessage('total_amount debe ser un número positivo'),
  body('payment_method')
    .isIn(['cash', 'card', 'transfer', 'check']).withMessage('payment_method inválido')
];

// ============ VALIDACIONES DE AJUSTES DE INVENTARIO ============

export const validateInventoryAdjustment = [
  body('product_id')
    .isInt({ min: 1 }).withMessage('product_id debe ser un número válido'),
  body('quantity_change')
    .isFloat()
    .withMessage('quantity_change debe ser un número')
    .custom(value => value !== 0).withMessage('quantity_change no puede ser 0'),
  body('reason')
    .trim()
    .notEmpty().withMessage('reason es requerido')
    .isIn(['merma', 'ajuste_fisico', 'robo', 'danado', 'devolucion', 'otro'])
    .withMessage('reason debe ser: merma, ajuste_fisico, robo, danado, devolucion u otro'),
  body('notes')
    .optional()
    .trim()
];

// ============ VALIDACIONES DE PAGINACIÓN ============

export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('page debe ser un número positivo'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit debe estar entre 1 y 100')
];

// ============ VALIDACIONES DE USUARIOS ============

export const validateUser = [
  body('username')
    .trim()
    .notEmpty().withMessage('username es requerido')
    .isLength({ min: 3 }).withMessage('username debe tener al menos 3 caracteres'),
  body('email')
    .trim()
    .isEmail().withMessage('email debe ser válido'),
  body('full_name')
    .trim()
    .notEmpty().withMessage('full_name es requerido'),
  body('password')
    .optional()
    .isLength({ min: 6 }).withMessage('password debe tener al menos 6 caracteres'),
  body('role_id')
    .optional()
    .isInt({ min: 1 }).withMessage('role_id debe ser un número válido')
];

// ============ VALIDACIONES DE CONTRASEÑA ============

export const validatePasswordChange = [
  body('currentPassword')
    .notEmpty().withMessage('currentPassword es requerido'),
  body('newPassword')
    .isLength({ min: 6 }).withMessage('newPassword debe tener al menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('newPassword debe contener mayúscula, minúscula y número'),
  body('confirmPassword')
    .notEmpty().withMessage('confirmPassword es requerido')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Las contraseñas no coinciden')
];

// ============ VALIDACIONES DE CONFIGURACIÓN ============

export const validateSetting = [
  body('storeName')
    .optional()
    .trim()
    .isLength({ min: 2 }).withMessage('storeName debe tener al menos 2 caracteres'),
  body('tax_rate')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('tax_rate debe estar entre 0-100'),
  body('currency')
    .optional()
    .isIn(['USD', 'CRC', 'EUR', 'MXN', 'COP']).withMessage('currency no válida'),
  body('language')
    .optional()
    .isIn(['es', 'en', 'pt']).withMessage('language no válida'),
  body('theme')
    .optional()
    .isIn(['light', 'dark', 'auto']).withMessage('theme no válida')
];

// ============ VALIDACIONES DE COMPRAS ============

export const validatePurchase = [
  body('provider_id')
    .isInt({ min: 1 }).withMessage('provider_id debe ser un número válido'),
  body('items')
    .isArray({ min: 1 }).withMessage('items debe ser un array con al menos 1 elemento'),
  body('items.*.product_id')
    .isInt({ min: 1 }).withMessage('product_id debe ser un número válido'),
  body('items.*.quantity')
    .isFloat({ min: 0.01 }).withMessage('quantity debe ser mayor a 0'),
  body('items.*.unit_cost')
    .isFloat({ min: 0 }).withMessage('unit_cost debe ser un número positivo'),
  body('subtotal')
    .isFloat({ min: 0 }).withMessage('subtotal debe ser un número positivo'),
  body('total_amount')
    .isFloat({ min: 0 }).withMessage('total_amount debe ser un número positivo')
];