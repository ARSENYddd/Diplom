import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const fetchData = (ticker, start, end) =>
  api.get('/data', { params: { ticker, start, end } }).then(r => r.data)

export const fetchForecast = (body) =>
  api.post('/forecast', body).then(r => r.data)

export const fetchComparison = (ticker, start, end) =>
  api.get('/compare', { params: { ticker, start, end } }).then(r => r.data)

export const fetchBacktest = (body) =>
  api.post('/backtest', body).then(r => r.data)
