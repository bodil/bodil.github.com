(ns sieve
  (:require [clojure [test :as test]]))

(def sqr #(* %1 %1))
(def sum #(reduce + %1))
(defn remove-from-set [set items] (apply disj (cons set items)))
(defn add-to-set [set items] (apply conj (cons set items)))


(test/with-test
  (defn primes-below [limit]
    #{2 3 5 7 11 13 17 19 23 29 31 37 41 43 47})
  (test/is (= #{2 3 5 7 11 13 17 19 23 29 31 37 41 43 47} (primes-below 50))))


