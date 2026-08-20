const http = require('http')

const server = http.createServer((req, res) => {
  res.writeHead(301, {
    Location: '/h5/',
    'Cache-Control': 'no-cache',
  })
  res.end()
})

server.listen(9000, '0.0.0.0', () => {
  console.log('club-redirect listening on 9000')
})
