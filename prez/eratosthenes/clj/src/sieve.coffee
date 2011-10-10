sieve = (limit) ->
  numbers = ((if n % 2 then true else false) for n in [0...limit])
  sum = 2
  factor = 3
  while factor * factor < limit
    if numbers[factor]
      sum += factor
      numbers[factor] = null
      (numbers[multiple] = null) for multiple in [(factor*factor)...limit] by (factor*2)
    factor++
  pos = 3
  while pos < limit
    (sum += pos) if numbers[pos]
    pos++
  sum

start = Date.now()
console.log "Answer = #{sieve 2000000}"
console.log "took #{Date.now() - start}ms"

