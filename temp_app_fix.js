      // DISABLED: All upgrade promotion functionality for safe free release
      if (search.includes('retry=payment')) {
        setActiveTab('generate');
        // DISABLED: Entire upgrade promotion section removed for safety
        console.log('Payment retry detected but upgrade promotion disabled for free release');
      }
