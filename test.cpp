#include <bits/stdc++.h>
using namespace std;
int solve(vector<int> A, int H){
   sort(A.begin(), A.end());
   int n = A.size();
   int x = (A[n - 1] + A[n - 2]);
   return H / x * 2 + (H % x + A[n - 1] - 1) / A[n - 1];
}
int main(){
   vector<int> A = {4,2};
   int H = 6;
   cout << solve(A, H) << endl;
}