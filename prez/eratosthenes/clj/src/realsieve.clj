(ns sieve
  (:require [clojure [test :as test]]))

(def sqr #(* %1 %1))

(test/with-test
  (defn primes-below
    "Find all primes below limit, which must be > 3."
    [limit]
    (loop
        ;; `primes` is a list that will be populated with the primes
        ;; we find during the iteration. We pre-initialise it with the
        ;; number 2, the only prime we never iterate over because we
        ;; skip even numbers for efficiency.
        [primes '(2)
         ;; `numbers` is the set of numbers we're going to iterate
         ;; over, and the sieve will eliminate numbers from this set
         ;; as we iterate.
         ;;
         ;; We initialise `numbers` with the set of odd numbers from 3
         ;; to limit. We skip even numbers, because we already know
         ;; they're not primes.
         numbers (apply sorted-set (range 3 limit 2))]
      ;; The first number in `numbers` will be a prime.
      (let [factor (first numbers)]
        ;; We loop until `numbers` becomes empty, or until `factor`²
        ;; exceeds `limit`. Once we have iterated over all primes
        ;; smaller than the square root of `limit`, further iteration
        ;; is not helpful, because we'll have eliminated all further
        ;; non-primes in the set already.
        (if (and (seq numbers) (> limit (sqr factor)))
          ;; Now that we know `factor` is a prime, we can eliminate
          ;; all multiples of it from `numbers`. We use the (range)
          ;; function to easily generate the set of multiples of
          ;; `factor` where `factor` < `limit`. Note that the range
          ;; increment is 2 * `factor` instead of just `factor`, which
          ;; enables us to skip the even multiples. Finally, we also
          ;; add `factor` to `primes`.
          (recur (cons factor primes)
                 (apply disj
                        (cons numbers
                              (cons factor
                                    (range (sqr factor) limit
                                           (+ factor factor))))))
          ;; When the iteration is done, the union of `primes` and
          ;; `numbers` will be the set of primes less than `limit`.
          (apply conj (cons numbers primes))))
      ))
  (test/is (= #{2 3 5 7 11 13 17 19 23 29 31 37 41 43 47} (primes-below 50))))


