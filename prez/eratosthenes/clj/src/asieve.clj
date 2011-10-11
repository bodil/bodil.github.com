(ns asieve
  (:require [clojure [test :as test]]))

(set! *unchecked-math* true)

(def sqr #(* %1 %1))

(defn sum-primes-below [^long limit]
    (let [^booleans numbers (make-array Boolean/TYPE (inc limit))]
      (aset numbers 2 true)
      (doseq [i (range 3 limit 2)] (aset numbers i true))
      (doseq [factor (range 3 (Math/sqrt limit) 2)]
        (if (aget numbers factor)
          (doseq [index (range (sqr factor) limit (+ factor factor))]
            (aset numbers index false))))
      (areduce numbers factor total 0
               (if (aget numbers factor)
                 (+ total factor)
                 total))))

