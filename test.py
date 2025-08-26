def findEnergy(A):
    if A == 1:
        return 0

    dp = [float('inf')] * (A + 1)
    dp[1] = 0
    
    for current_lines in range(1, A + 1):
        if dp[current_lines] == float('inf'):
            continue
            
        for selected in range(1, current_lines + 1):
            energy_cost = selected + 1
            new_lines = current_lines + selected
            
            if new_lines <= A:
                dp[new_lines] = min(dp[new_lines], dp[current_lines] + energy_cost)
            
            paste_count = 1
            while current_lines + selected * (paste_count + 1) <= A:
                paste_count += 1
                total_lines = current_lines + selected * paste_count
                total_energy = dp[current_lines] + selected + 1 + (paste_count - 1)
                dp[total_lines] = min(dp[total_lines], total_energy)
        
        energy_cost = 2
        new_lines = current_lines * 2
        
        if new_lines <= A:
            dp[new_lines] = min(dp[new_lines], dp[current_lines] + energy_cost)
        
        paste_count = 1
        while current_lines * (paste_count + 2) <= A:
            paste_count += 1
            total_lines = current_lines * (paste_count + 1)
            total_energy = dp[current_lines] + 2 + (paste_count - 1)
            dp[total_lines] = min(dp[total_lines], total_energy)
    
    return dp[A]

# Test cases
def test_solution():
    print(f"A=3: {findEnergy(3)}")  # Expected: 3
    print(f"A=6: {findEnergy(13)}")  # Expected: 5
    
    # Let's trace A=3:
    # Start: 1 line
    # Select 1 line (1 energy) + copy+paste (1 energy) = 2 lines, total 2 energy
    # Paste again (1 energy) = 3 lines, total 3 energy
    
    # Let's trace A=6:
    # Start: 1 line
    # Select 1 line (1 energy) + copy+paste (1 energy) = 2 lines, total 2 energy  
    # CTRL+A (1 energy) + copy+paste (1 energy) = 4 lines, total 4 energy
    # Paste again (1 energy) = 6 lines, total 5 energy

test_solution()

