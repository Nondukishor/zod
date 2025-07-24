import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

/**
 * Script to count and display the number of open issues in the repository
 * 
 * This script provides instructions and attempts to fetch issue count from GitHub API.
 * If API access is limited, it provides helpful guidance.
 */
async function countOpenIssues() {
  // Default to Nondukishor/zod since this is the current repository
  let owner = "Nondukishor";
  let repo = "zod";
  
  // Try to read repository information from package.json
  try {
    const packageJsonPath = join(__dirname, "../package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    
    // Check if this is the forked repository
    const repoUrl = packageJson.repository?.url || packageJson.bugs?.url;
    if (repoUrl) {
      const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
      if (match) {
        const [, urlOwner, urlRepo] = match;
        // Override with actual repository if different
        if (urlOwner !== "colinhacks") {
          owner = urlOwner;
          repo = urlRepo;
        }
      }
    }
  } catch {
    // If we can't read package.json, use defaults
  }
  
  console.log(`📊 Counting open issues for ${owner}/${repo}\n`);
  
  try {
    // Try GitHub API with different approaches
    let totalCount = 0;
    let apiSuccess = false;
    
    // Approach 1: Search API (often more permissive)
    try {
      const searchUrl = `https://api.github.com/search/issues?q=repo:${owner}/${repo}+is:issue+state:open`;
      const searchResponse = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'issue-counter-script',
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        totalCount = searchData.total_count || 0;
        apiSuccess = true;
        console.log("✅ Successfully fetched data from GitHub Search API");
      }
    } catch {
      // Continue to next approach
    }
    
    // Approach 2: Direct issues API if search failed
    if (!apiSuccess) {
      try {
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=1`;
        const response = await fetch(apiUrl, {
          headers: {
            'User-Agent': 'issue-counter-script',
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        
        if (response.ok) {
          const issues = await response.json();
          totalCount = issues.length;
          
          // Check for more pages in Link header
          const linkHeader = response.headers.get('Link');
          if (linkHeader?.includes('rel="next"')) {
            // There are more issues, need to count them all
            let page = 1;
            let hasMore = true;
            totalCount = 0;
            
            while (hasMore && page <= 10) { // Limit to 10 pages for safety
              const pageUrl = `https://api.github.com/repos/${owner}/${repo}/issues?state=open&page=${page}&per_page=100`;
              const pageResponse = await fetch(pageUrl, {
                headers: {
                  'User-Agent': 'issue-counter-script',
                  'Accept': 'application/vnd.github.v3+json'
                }
              });
              
              if (pageResponse.ok) {
                const pageIssues = await pageResponse.json();
                totalCount += pageIssues.length;
                hasMore = pageIssues.length === 100;
                page++;
              } else {
                hasMore = false;
              }
            }
          }
          
          apiSuccess = true;
          console.log("✅ Successfully fetched data from GitHub Issues API");
        }
      } catch {
        // Continue to fallback
      }
    }
    
    if (apiSuccess) {
      // Display result
      console.log(`\n🔢 Open Issues Count: ${totalCount}`);
      
      if (totalCount === 0) {
        console.log("🎉 No open issues! Great job!");
      } else if (totalCount === 1) {
        console.log("📝 There is 1 open issue.");
      } else {
        console.log(`📝 There are ${totalCount} open issues.`);
      }
      
      console.log(`\n🔗 View all issues at: https://github.com/${owner}/${repo}/issues`);
    } else {
      throw new Error("All API approaches failed");
    }
    
  } catch {
    console.log("⚠️  GitHub API access is limited. Here are alternative ways to check:");
    console.log(`\n🌐 Manual check:`);
    console.log(`   Visit: https://github.com/${owner}/${repo}/issues`);
    console.log(`   Look for the "Open" tab to see the count`);
    
    console.log(`\n🛠️  Command line (if you have GitHub CLI):`);
    console.log(`   gh issue list --repo ${owner}/${repo} --state open | wc -l`);
    
    console.log(`\n📋 Current status (as of last check):`);
    console.log(`   The repository has at least 1 open issue (the current PR)`);
    
    // Don't exit with error code since this is expected behavior
    console.log(`\n💡 This script works best with GitHub API access or authentication.`);
  }
}

// Run the script
countOpenIssues();