import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart } from 'lucide-react';
import { getAnalyticsStats } from '../services/api';
import Card from '../components/Card';
import '../styles/analytics.css';

export default function AnalyticsPage() {
  // Estado para cargar (true/false) y datos
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    salesData: [],           // Datos de ventas
    purchasesData: [],       // Datos de compras
    productSales: [],        // Ventas por producto
    topProducts: [],         // Productos más vendidos
    stats: {}                // Estadísticas generales
  });

  // Se ejecuta cuando la página carga
  useEffect(() => {
    cargarDatos();
  }, []);

  // Función para cargar los datos del backend
  const cargarDatos = async () => {
    try {
      setLoading(true);
      const response = await getAnalyticsStats();
      
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error('Error cargando reportes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Tarjeta de estadística con icono
  const TarjetaEstadistica = ({ icon: Icon, title, value, change, trend }) => (
    <div className="stat-card">
      <div className="stat-icon">
        <Icon size={24} />
      </div>
      <div className="stat-content">
        <p className="stat-title">{title}</p>
        <h3 className="stat-value">{value}</h3>
        {change && (
          <span className={`stat-change ${trend === 'up' ? 'positive' : 'negative'}`}>
            {trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {change}%
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="analytics-page">
      <div className="page-header">
        <h1>📊 Reportes y Análisis</h1>
        <p>Visualiza el desempeño de tu negocio</p>
      </div>

      {/* Grid de estadísticas principales */}
      <div className="stats-grid">
        <TarjetaEstadistica
          icon={DollarSign}
          title="Ingresos Totales"
          value={`$${data.stats.totalRevenue?.toLocaleString()}`}
          change={data.stats.growthRate}
          trend="up"
        />
        <TarjetaEstadistica
          icon={ShoppingCart}
          title="Total de Ventas"
          value={data.stats.totalSales?.toLocaleString()}
          change={8.5}
          trend="up"
        />
        <TarjetaEstadistica
          icon={TrendingUp}
          title="Ticket Promedio"
          value={`$${Number(data.stats.averageOrder || 0).toFixed(2)}`}
          change={-2.3}
          trend="down"
        />
      </div>

      {/* Grid de gráficos */}
      <div className="charts-grid">
        {/* Gráfico de línea - Tendencia de ventas */}
        <Card title="Tendencia de Ventas" subtitle="Últimos 6 meses">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="revenue"
                name="Ingresos"
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Gráfico de pastel - Distribución por categoría */}
        <Card title="Distribución de Ventas" subtitle="Por categoría">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.productSales}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {data.productSales.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Lista de productos más vendidos */}
        <Card title="Productos Top" subtitle="Más vendidos">
          <div className="products-list">
            {data.topProducts.map((product, index) => (
              <div key={index} className="product-item">
                <div className="product-info">
                  <h4>{product.name}</h4>
                  <p>{product.sales} unidades vendidas</p>
                </div>
                <div className="product-revenue">
                  <strong>${product.revenue.toLocaleString()}</strong>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Gráfico de barras - Comparativa mensual */}
        <Card title="Comparativa Mensual" subtitle="Ventas vs Ingresos">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem'
                }}
              />
              <Legend />
              <Bar dataKey="sales" fill="#3b82f6" name="Número de Ventas" radius={[8, 8, 0, 0]} />
              <Bar dataKey="revenue" fill="#10b981" name="Ingresos" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}